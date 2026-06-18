const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
let PDFDocument = null;
try { PDFDocument = require('pdfkit'); } catch (e) { console.log('pdfkit не установлен: PDF-чеки будут недоступны до npm install'); }
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PUBLIC_DIR = path.join(__dirname, 'public');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env');
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

let bookingsCache = { bookings: [] };
let pricesCache = null;
let tgStateCache = {};
let adminAccountsCache = [];

function sha256(value) {
    return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

// ========== ФУНКЦИЯ ВАЛИДАЦИИ ДАТ ==========
function validateDate(dateStr) {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    // Проверяем формат YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        throw new Error(`Invalid date format: "${str}". Expected YYYY-MM-DD`);
    }
    // Проверяем, что дата существует
    const [year, month, day] = str.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        throw new Error(`Invalid date: "${str}" does not exist`);
    }
    return str;
}

// ========== ФУНКЦИЯ ДЛЯ РАБОТЫ С ДАТАМИ ==========
function dateRange(startDate, endDate, inclusive = false) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    if (inclusive) end.setDate(end.getDate() + 1);

    while (current < end) {
        const dateStr = current.toISOString().split('T')[0];
        dates.push(dateStr);
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

function formatRuDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = String(dateStr).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('ru-RU');
}

const DEFAULT_PRICES = {
    rooms: {
        1: { name: 'Номер №1', price: 120 },
        2: { name: 'Номер №2', price: 130 },
        3: { name: 'Номер №3', price: 110 },
        4: { name: 'Номер №4', price: 110 }
    },
    tours: {
        1: { name: 'Сванские башни', price: 300, duration: '2 дня' },
        2: { name: 'Портовый город', price: 50, duration: '2–3 часа' },
        3: { name: 'Горячие источники', price: 120, duration: '1 день' },
        4: { name: 'Закат над облаками', price: 90, duration: '3–4 часа' },
        5: { name: 'Подземное царство', price: 80, duration: '4–5 часов' }
    },
    roomDatePrices: {},
    tourDatePrices: {},
    closedDates: {},
    occupancyRules: {
        enabled: true,
        thresholds: [
            { occupancy: 50, percent: 10 },
            { occupancy: 75, percent: 20 },
            { occupancy: 100, percent: 30 }
        ]
    }
};

async function initData() {
    const { data: pricesRow, error: pricesError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'prices')
        .maybeSingle();
    if (pricesError) throw pricesError;

    if (!pricesRow) {
        pricesCache = clone(DEFAULT_PRICES);
        await supabase.from('app_settings').upsert({ key: 'prices', value: pricesCache });
    } else {
        pricesCache = mergePrices(pricesRow.value || {});
    }

    const { data: tgRow, error: tgError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'telegram_state')
        .maybeSingle();
    if (tgError) throw tgError;
    tgStateCache = tgRow?.value || {};
    if (!tgRow) await supabase.from('app_settings').upsert({ key: 'telegram_state', value: tgStateCache });

    const { data: bookingRows, error: bookingsError } = await supabase
        .from('bookings')
        .select('id,data')
        .order('created_at', { ascending: true });
    if (bookingsError) throw bookingsError;
    bookingsCache = { bookings: (bookingRows || []).map(row => ({ ...(row.data || {}), id: row.id })) };

    await loadAdminAccounts();
}

function mergePrices(saved) {
    return {
        rooms: { ...DEFAULT_PRICES.rooms, ...(saved.rooms || {}) },
        tours: { ...DEFAULT_PRICES.tours, ...(saved.tours || {}) },
        roomDatePrices: saved.roomDatePrices || {},
        tourDatePrices: saved.tourDatePrices || {},
        closedDates: saved.closedDates || {},
        occupancyRules: { ...DEFAULT_PRICES.occupancyRules, ...(saved.occupancyRules || {}), thresholds: (saved.occupancyRules && saved.occupancyRules.thresholds) || DEFAULT_PRICES.occupancyRules.thresholds }
    };
}

async function loadAdminAccounts() {
    const { data, error } = await supabase
        .from('admin_accounts')
        .select('username,password_hash,is_active')
        .eq('is_active', true);
    if (error) throw error;
    adminAccountsCache = data || [];

    if (!adminAccountsCache.length && process.env.ADMIN_PASSWORD) {
        const username = process.env.ADMIN_USERNAME || 'admin';
        const passwordHash = sha256(process.env.ADMIN_PASSWORD);
        const { error: insertError } = await supabase
            .from('admin_accounts')
            .insert({ username, password_hash: passwordHash, is_active: true });
        if (insertError && insertError.code !== '23505') throw insertError;
        adminAccountsCache = [{ username, password_hash: passwordHash, is_active: true }];
    }
}

function isAdminAuthorized({ username, password }) {
    const passwordHash = sha256(password);
    const login = String(username || '').trim().toLowerCase();
    return adminAccountsCache.some(account => {
        if (!account.is_active) return false;
        if (login && String(account.username || '').toLowerCase() !== login) return false;
        return account.password_hash === passwordHash;
    });
}

function requireAdmin(req, res) {
    if (!isAdminAuthorized(req.body || req.query || {})) {
        res.status(401).json({ error: 'Неверный логин или пароль' });
        return false;
    }
    return true;
}

function loadBookings() {
    return clone(bookingsCache);
}

async function saveBookings(data) {
    bookingsCache = clone(data);
    // Используем upsert вместо delete + insert для избежания проблем с типами
    const rows = (data.bookings || []).map(booking => {
        // Валидируем даты перед сохранением
        const checkIn = booking.checkIn ? validateDate(booking.checkIn) : null;
        const checkOut = booking.checkOut ? validateDate(booking.checkOut) : null;

        return {
            id: Number(booking.id),
            type: booking.type || 'room',
            status: booking.status || 'confirmed',
            check_in: checkIn,
            check_out: checkOut,
            created_at: booking.createdAt || new Date().toISOString(),
            data: { ...booking, checkIn, checkOut } // сохраняем валидные даты
        };
    });

    // Удаляем все старые записи
    const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .neq('id', 0);
    if (deleteError) throw deleteError;

    // Вставляем новые записи, только если они есть
    if (rows.length) {
        const { error: insertError } = await supabase
            .from('bookings')
            .insert(rows);
        if (insertError) throw insertError;
    }
}

function loadPrices() {
    return mergePrices(pricesCache || DEFAULT_PRICES);
}

async function savePrices(data) {
    pricesCache = mergePrices(data);
    const { error } = await supabase.from('app_settings').upsert({ key: 'prices', value: pricesCache });
    if (error) throw error;
}

async function saveTelegramPhoto(message, target) {
    const botToken = process.env.TG_BOT_TOKEN;
    const photos = message.photo || [];
    if (!photos.length) throw new Error('Фото не найдено');
    const best = photos[photos.length - 1];
    const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${best.file_id}`);
    const fileInfo = await fileInfoRes.json();
    if (!fileInfo.ok || !fileInfo.result?.file_path) throw new Error('Не удалось получить файл из Telegram');
    const ext = path.extname(fileInfo.result.file_path) || '.jpg';
    let dir;
    let fileName;
    const stamp = Date.now();
    if (target.kind === 'room') {
        dir = path.join(PUBLIC_DIR, 'images', 'rooms');
        fileName = `room-${target.id}-tg-${stamp}${ext}`;
    } else if (target.kind === 'tour') {
        dir = path.join(PUBLIC_DIR, 'images', 'tours');
        fileName = `tour-${target.id}-tg-${stamp}${ext}`;
    } else {
        dir = path.join(PUBLIC_DIR, 'images', 'mainimg');
        fileName = `mainimg-tg-${stamp}${ext}`;
    }
    ensureDir(dir);
    const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`);
    const buffer = await fileRes.buffer();
    const outputPath = path.join(dir, fileName);
    fs.writeFileSync(outputPath, buffer);
    return path.relative(PUBLIC_DIR, outputPath).replace(/\\/g, '/');
}

// Получить актуальные цены для сайта
app.get('/api/prices', (req, res) => {
    res.json(loadPrices());
});


app.get('/api/media', (req, res) => {
    res.json({ media: listMediaFiles() });
});

app.get('/api/room-media', (req, res) => {
    res.json({ rooms: listRoomImageFiles() });
});

app.get('/api/tour-media', (req, res) => {
    res.json({ tours: listTourImageFiles() });
});

app.get('/api/available-rooms', (req, res) => {
    try {
        const { checkIn, checkOut } = req.query;

        // Валидируем даты
        const validCheckIn = validateDate(checkIn);
        const validCheckOut = validateDate(checkOut);

        if (new Date(validCheckOut) <= new Date(validCheckIn)) {
            return res.status(400).json({ error: 'Дата выезда должна быть позже даты заезда' });
        }

        const prices = loadPrices();
        const nights = dateRange(validCheckIn, validCheckOut, false).length;
        const rooms = Object.entries(prices.rooms).filter(([id]) => isRoomAvailable(id, validCheckIn, validCheckOut)).map(([id, room]) => ({
            id: Number(id),
            name: room.name,
            price: room.price,
            total: calculateBookingPrice({ type: 'room', roomId: id, checkIn: validCheckIn, checkOut: validCheckOut, prices })
        }));
        res.json({ checkIn: validCheckIn, checkOut: validCheckOut, nights, rooms });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
});

// Получить правила цен и закрытые даты
app.post('/api/quote', (req, res) => {
    try {
        const { type, roomId, tourId, tourName, checkIn, checkOut } = req.body;

        // Валидируем даты
        const validCheckIn = validateDate(checkIn);
        const validCheckOut = validateDate(checkOut);

        const prices = loadPrices();
        const closedDate = hasClosedDates(validCheckIn, validCheckOut, type || 'room', prices);
        if (closedDate) return res.status(400).json({ error: `Бронирование закрыто на дату ${formatRuDate(closedDate)}` });

        const total = calculateBookingPrice({ type, roomId, tourId, tourName, checkIn: validCheckIn, checkOut: validCheckOut, prices });
        res.json({ total });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
});

// Получить занятые даты для номеров
app.get('/api/booked-dates', (req, res) => {
    const data = loadBookings();
    const bookedDates = {};

    data.bookings.forEach(booking => {
        if (booking.status === 'cancelled' || booking.type === 'tour') return;
        if (!bookedDates[booking.roomId]) bookedDates[booking.roomId] = [];

        try {
            const start = new Date(validateDate(booking.checkIn));
            const end = new Date(validateDate(booking.checkOut));

            while (start < end) {
                const dateStr = start.toISOString().split('T')[0];
                bookedDates[booking.roomId].push(dateStr);
                start.setDate(start.getDate() + 1);
            }
        } catch (error) {
            console.error('Ошибка обработки даты бронирования:', error, booking);
        }
    });

    const prices = loadPrices();
    Object.keys(prices.closedDates || {}).forEach(dateStr => {
        for (const roomId of Object.keys(prices.rooms || {})) {
            if (!bookedDates[roomId]) bookedDates[roomId] = [];
            bookedDates[roomId].push(dateStr);
        }
    });
    res.json(bookedDates);
});

// Проверить доступность номера
app.post('/api/check-availability', (req, res) => {
    try {
        const { roomId, checkIn, checkOut } = req.body;

        // Валидируем даты
        const validCheckIn = validateDate(checkIn);
        const validCheckOut = validateDate(checkOut);

        const data = loadBookings();
        const prices = loadPrices();
        const checkInDate = new Date(validCheckIn);
        const checkOutDate = new Date(validCheckOut);

        const closedDate = hasClosedDates(validCheckIn, validCheckOut, 'room', prices);
        if (closedDate) return res.json({ available: false, reason: `Дата закрыта для бронирования: ${formatRuDate(closedDate)}` });

        let isAvailable = true;
        for (const booking of data.bookings) {
            if (booking.roomId === roomId && booking.status !== 'cancelled' && booking.type !== 'tour') {
                try {
                    const bookingIn = new Date(validateDate(booking.checkIn));
                    const bookingOut = new Date(validateDate(booking.checkOut));
                    if (!(checkOutDate <= bookingIn || checkInDate >= bookingOut)) {
                        isAvailable = false;
                        break;
                    }
                } catch (error) {
                    console.error('Ошибка обработки даты бронирования:', error, booking);
                }
            }
        }
        res.json({ available: isAvailable });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
});

// Отправка в Telegram
async function sendTelegramNotification(booking) {
    const botToken = process.env.TG_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_ID;

    if (!botToken || botToken.includes('ВАШ') || botToken === '7310946404:AAHdJoQk4_kX2jjZR9K-UxINXZ7zMUq-rpU') {
        console.log('⚠️ Telegram не настроен. Укажите свой TG_BOT_TOKEN в .env');
        return;
    }

    const typeIcon = booking.type === 'tour' ? '✈️' : '🏨';
    const typeText = booking.type === 'tour' ? 'БРОНИРОВАНИЕ ТУРА' : 'БРОНИРОВАНИЕ НОМЕРА';

    const message = `${typeIcon} НОВОЕ ${typeText} ${typeIcon}

👤 Гость: ${booking.guestName}
📞 Телефон: ${booking.guestPhone}
📱 Telegram: ${booking.guestTelegram || 'не указан'}
📧 Email: ${booking.guestEmail || 'не указан'}

${booking.type === 'tour' ? `🎯 Тур: ${booking.tourName}` : `🛏 Номер: ${booking.roomName}`}
👥 Гостей: ${booking.guestsCount}

📅 ${booking.type === 'tour' ? 'Дата тура' : 'Заезд'}: ${formatRuDate(booking.checkIn)}${booking.type === 'tour' && booking.checkOut === booking.checkIn ? '' : `
📅 ${booking.type === 'tour' ? 'Окончание' : 'Выезд'}: ${formatRuDate(booking.checkOut)}`}
💰 Стоимость: ${booking.totalPrice}₾

📝 Пожелания: ${booking.notes || 'нет'}`;

    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message })
        });
        const result = await response.json();
        if (result.ok) {
            console.log('✅ Уведомление в Telegram отправлено');
        } else {
            console.log('❌ Ошибка Telegram:', result);
        }
    } catch (error) {
        console.error('❌ Ошибка отправки в Telegram:', error.message);
    }
}

function calculateBookingPrice({ type, roomId, tourId, tourName, checkIn, checkOut, clientTotal, prices }) {
    try {
        const validCheckIn = validateDate(checkIn);
        const validCheckOut = validateDate(checkOut);

        if ((type || 'room') === 'tour') {
            return getTourDatePrice(tourId, tourName, validCheckIn, prices) || Number(clientTotal || 0);
        }
        const nights = dateRange(validCheckIn, validCheckOut, false);
        const total = nights.reduce((sum, dateStr) => sum + getRoomNightPrice(roomId, dateStr, prices), 0);
        return total || Number(clientTotal || 0);
    } catch (error) {
        console.error('Ошибка расчета цены:', error);
        return Number(clientTotal || 0);
    }
}

// Создать бронирование
app.post('/api/bookings', async (req, res) => {
    try {
        const { type, roomId, roomName, tourId, tourName, guestName, guestPhone, guestTelegram, guestEmail, guestsCount, checkIn, checkOut, totalPrice, notes } = req.body;

        // Валидируем даты
        const validCheckIn = validateDate(checkIn);
        const validCheckOut = validateDate(checkOut);

        const data = loadBookings();
        const prices = loadPrices();
        const checkInDate = new Date(validCheckIn);
        const checkOutDate = new Date(validCheckOut);
        const closedDate = hasClosedDates(validCheckIn, validCheckOut, type || 'room', prices);
        if (closedDate) {
            return res.status(400).json({ error: `Бронирование закрыто на дату ${formatRuDate(closedDate)}` });
        }

        // Проверка доступности только для номеров
        if (type !== 'tour') {
            let isAvailable = true;
            for (const booking of data.bookings) {
                if (booking.roomId === roomId && booking.status !== 'cancelled' && booking.type !== 'tour') {
                    try {
                        const bookingIn = new Date(validateDate(booking.checkIn));
                        const bookingOut = new Date(validateDate(booking.checkOut));
                        if (!(checkOutDate <= bookingIn || checkInDate >= bookingOut)) {
                            isAvailable = false;
                            break;
                        }
                    } catch (error) {
                        console.error('Ошибка проверки доступности:', error, booking);
                    }
                }
            }
            if (!isAvailable) {
                return res.status(400).json({ error: 'Номер уже забронирован на выбранные даты' });
            }
        }

        const newBooking = {
            id: Date.now(),
            type: type || 'room',
            roomId: roomId || null,
            roomName: roomName || null,
            tourId: tourId || null,
            tourName: tourName || null,
            guestName,
            guestPhone,
            guestTelegram: guestTelegram || '',
            guestEmail: guestEmail || '',
            guestsCount,
            checkIn: validCheckIn,
            checkOut: validCheckOut,
            totalPrice: calculateBookingPrice({ type, roomId, tourId, tourName, checkIn: validCheckIn, checkOut: validCheckOut, guestsCount, clientTotal: totalPrice, prices }),
            status: 'confirmed',
            notes: notes || '',
            createdAt: new Date().toISOString()
        };

        data.bookings.push(newBooking);
        await saveBookings(data);

        // Отправляем уведомление в Telegram
        await sendTelegramNotification(newBooking);

        res.json({ success: true, booking: newBooking });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
});

// ========== АДМИН API ==========
app.post('/api/admin/bookings', async (req, res) => {
    const { filter } = req.body;
    if (!requireAdmin(req, res)) return;

    let data = loadBookings();
    let bookings = [...data.bookings];
    const now = new Date();

    if (filter && filter !== 'all') {
        if (filter === 'year') {
            const yearAgo = new Date();
            yearAgo.setFullYear(now.getFullYear() - 1);
            bookings = bookings.filter(b => new Date(b.createdAt) >= yearAgo);
        } else {
            const days = parseInt(filter);
            if (!isNaN(days)) {
                const cutoffDate = new Date();
                cutoffDate.setDate(now.getDate() - days);
                bookings = bookings.filter(b => new Date(b.createdAt) >= cutoffDate);
            }
        }
    }

    res.json({ bookings });
});

app.post('/api/admin/delete', async (req, res) => {
    const { bookingId } = req.body;
    if (!requireAdmin(req, res)) return;
    const data = loadBookings();
    data.bookings = data.bookings.filter(b => String(b.id) !== String(bookingId));
    await saveBookings(data);
    res.json({ success: true });
});

app.post('/api/admin/cancel', async (req, res) => {
    const { bookingId } = req.body;
    if (!requireAdmin(req, res)) return;
    const data = loadBookings();
    const booking = data.bookings.find(b => String(b.id) === String(bookingId));
    if (booking) {
        booking.status = 'cancelled';
        await saveBookings(data);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Бронирование не найдено' });
    }
});


app.post('/api/admin/calendar', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const days = {};
    getActiveBookings().forEach(booking => {
        eachBookedDay(booking, (dateStr) => {
            if (!days[dateStr]) days[dateStr] = [];
            days[dateStr].push({
                id: booking.id,
                type: booking.type || 'room',
                itemName: booking.type === 'tour' ? booking.tourName : booking.roomName,
                guestName: booking.guestName,
                guestPhone: booking.guestPhone
            });
        });
    });
    const prices = loadPrices();
    Object.entries(prices.closedDates || {}).forEach(([dateStr, info]) => {
        if (!days[dateStr]) days[dateStr] = [];
        days[dateStr].push({
            id: `closed-${dateStr}`,
            type: 'closed',
            itemName: 'Закрыто для бронирования',
            guestName: info.reason || 'Закрыто администратором',
            guestPhone: ''
        });
    });
    res.json({ days });
});


app.post('/api/admin/admins/create', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { newUsername, newPassword } = req.body;
    if (!newUsername || !newPassword || String(newPassword).length < 6) {
        return res.status(400).json({ error: 'Укажите newUsername и newPassword минимум 6 символов' });
    }
    const { error } = await supabase.from('admin_accounts').insert({
        username: String(newUsername).trim(),
        password_hash: sha256(newPassword),
        is_active: true
    });
    if (error) return res.status(400).json({ error: error.message });
    await loadAdminAccounts();
    res.json({ success: true });
});

app.post('/api/admin/stats', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const data = loadBookings();
    const total = data.bookings.length;
    const active = data.bookings.filter(b => b.status === 'confirmed').length;
    const confirmed = data.bookings.filter(b => b.status === 'confirmed');
    const revenue = confirmed.reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const monthRevenue = confirmed.filter(b => new Date(b.createdAt || b.checkIn) >= monthStart).reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);
    const futureRevenue = confirmed.filter(b => new Date(b.checkIn) >= new Date()).reduce((sum, b) => sum + Number(b.totalPrice || 0), 0);
    const avgBooking = confirmed.length ? Math.round(revenue / confirmed.length) : 0;
    res.json({ total, active, cancelled: total - active, revenue, monthRevenue, futureRevenue, avgBooking });
});


app.post('/api/admin/move-booking', async (req, res) => {
    const { bookingId, newCheckIn } = req.body;
    if (!requireAdmin(req, res)) return;

    try {
        // Валидируем дату
        const validNewCheckIn = validateDate(newCheckIn);

        const data = loadBookings();
        const prices = loadPrices();
        const booking = data.bookings.find(b => String(b.id) === String(bookingId));
        if (!booking) return res.status(404).json({ error: 'Бронирование не найдено' });

        const oldIn = new Date(validateDate(booking.checkIn));
        const oldOut = new Date(validateDate(booking.checkOut || booking.checkIn));
        const newIn = new Date(validNewCheckIn);
        const newOut = new Date(newIn);

        if ((booking.type || 'room') === 'tour') {
            const days = Math.max(1, Math.round((oldOut - oldIn) / 86400000) + 1);
            newOut.setDate(newOut.getDate() + days - 1);
        } else {
            const nights = Math.max(1, Math.round((oldOut - oldIn) / 86400000));
            newOut.setDate(newOut.getDate() + nights);
        }
        const newOutStr = newOut.toISOString().split('T')[0];

        const closedDate = hasClosedDates(validNewCheckIn, newOutStr, booking.type || 'room', prices);
        if (closedDate) return res.status(400).json({ error: `Дата закрыта: ${formatRuDate(closedDate)}` });

        if ((booking.type || 'room') !== 'tour') {
            for (const other of data.bookings) {
                if (String(other.id) === String(booking.id) || other.status === 'cancelled' || other.type === 'tour' || String(other.roomId) !== String(booking.roomId)) continue;
                try {
                    const otherIn = new Date(validateDate(other.checkIn));
                    const otherOut = new Date(validateDate(other.checkOut));
                    if (!(newOut <= otherIn || newIn >= otherOut)) {
                        return res.status(400).json({ error: 'На новую дату номер уже занят' });
                    }
                } catch (error) {
                    console.error('Ошибка проверки даты:', error);
                }
            }
        }
        booking.checkIn = validNewCheckIn;
        booking.checkOut = newOutStr;
        booking.totalPrice = calculateBookingPrice({ type: booking.type, roomId: booking.roomId, tourId: booking.tourId, tourName: booking.tourName, checkIn: booking.checkIn, checkOut: booking.checkOut, prices });
        await saveBookings(data);
        res.json({ success: true, booking });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
});

function getPdfFontPath() {
    const candidates = [
        process.env.PDF_FONT_PATH,
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf',
        '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
        '/Library/Fonts/Arial Unicode.ttf',
        '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
        'C:\\Windows\\Fonts\\arial.ttf',
        'C:\\Windows\\Fonts\\segoeui.ttf'
    ].filter(Boolean);
    return candidates.find(file => fs.existsSync(file));
}

app.get('/api/admin/receipt/:id.pdf', (req, res) => {
    if (!isAdminAuthorized({ username: req.query.username, password: req.query.password })) return res.status(401).send('Неверный логин или пароль');
    const data = loadBookings();
    const booking = data.bookings.find(b => String(b.id) === String(req.params.id));
    if (!booking) return res.status(404).send('Бронирование не найдено');
    if (!PDFDocument) return res.status(500).send('Установите зависимости: npm install');

    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${booking.id}.pdf`);

    const fontPath = getPdfFontPath();
    if (!fontPath) {
        return res.status(500).send('Не найден Unicode-шрифт для PDF. Установите DejaVu/Noto Sans на сервер или укажите PDF_FONT_PATH в .env.');
    }

    const doc = new PDFDocument({ margin: 50, bufferPages: true, info: { Title: `Чек бронирования №${booking.id}` } });
    doc.pipe(res);
    doc.registerFont('AppFont', fontPath);
    doc.font('AppFont');

    const typeLabel = (booking.type || 'room') === 'tour' ? 'Тур' : 'Номер';
    const itemName = (booking.type || 'room') === 'tour' ? booking.tourName : booking.roomName;
    const statusLabel = booking.status === 'confirmed' ? 'Подтверждено' : booking.status === 'cancelled' ? 'Отменено' : 'Ожидает подтверждения';

    doc.fontSize(20).text('Meskhi House — чек бронирования');
    doc.moveDown();
    doc.fontSize(12)
        .text(`Номер бронирования: ${booking.id}`)
        .text(`Гость: ${booking.guestName || '-'}`)
        .text(`Телефон: ${booking.guestPhone || '-'}`)
        .text(`Telegram: ${booking.guestTelegram || '-'}`)
        .text(`Email: ${booking.guestEmail || '-'}`)
        .text(`Тип: ${typeLabel}`)
        .text(`Объект: ${itemName || '-'}`)
        .text(`Даты: ${booking.checkIn} — ${booking.checkOut}`)
        .text(`Гостей: ${booking.guestsCount || '-'}`)
        .text(`Итого: ${booking.totalPrice || 0} ₾`)
        .text(`Статус: ${statusLabel}`)
        .moveDown()
        .text('Спасибо! Чек сформирован автоматически.');

    doc.end();
});


// ========== TELEGRAM BOT ==========
let tgOffset = 0;

function isTelegramConfigured() {
    const token = process.env.TG_BOT_TOKEN || '';
    return token && !token.includes('ВАШ') && token !== '7310946404:AAHdJoQk4_kX2jjZR9K-UxINXZ7zMUq-rpU';
}

async function tgSend(chatId, text, replyMarkup) {
    const botToken = process.env.TG_BOT_TOKEN;
    const body = { chat_id: chatId, text };
    if (replyMarkup) body.reply_markup = replyMarkup;
    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (e) {
        console.log('Telegram send error:', e.message);
    }
}

function buildBookingsText(type = 'all') {
    let bookings = getActiveBookings();
    if (type !== 'all') bookings = bookings.filter(b => (b.type || 'room') === type);
    bookings.sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
    if (!bookings.length) return 'Активных заявок нет.';
    return bookings.slice(0, 20).map(b => {
        const title = b.type === 'tour' ? `🎯 ${b.tourName}` : `🏨 ${b.roomName}`;
        const dates = b.type === 'tour'
            ? `${formatRuDate(b.checkIn)}${b.checkOut && b.checkOut !== b.checkIn ? ' — ' + formatRuDate(b.checkOut) : ''}`
            : `${formatRuDate(b.checkIn)} — ${formatRuDate(b.checkOut)}`;
        return `${title}\n👤 ${b.guestName}\n📞 ${b.guestPhone}\n📅 ${dates}\n💰 ${b.totalPrice}₾`;
    }).join('\n\n');
}

async function handleTelegramMessage(message) {
    const chatId = String(message.chat.id);
    const allowedChatId = String(process.env.TG_CHAT_ID || '');
    if (allowedChatId && chatId !== allowedChatId) {
        await tgSend(chatId, 'Доступ запрещён.');
        return;
    }
    const state = loadTgState();
    if (message.photo && state[chatId]) {
        try {
            const saved = await saveTelegramPhoto(message, state[chatId]);
            delete state[chatId];
            await saveTgState(state);
            await tgSend(chatId, `✅ Фото загружено: ${saved}\nОно появится на сайте после обновления страницы.`);
        } catch (error) {
            await tgSend(chatId, `❌ Не удалось загрузить фото: ${error.message}`);
        }
        return;
    }
    const text = (message.text || '').trim();
    const keyboard = {
        keyboard: [
            [{ text: '/help' }, { text: '/tours' }, { text: '/prices' }],
            [{ text: '/bookings' }, { text: '/rooms' }, { text: '/tourbookings' }],
        ],
        resize_keyboard: true
    };
    if (text === '/start' || text === '/help') {
        await tgSend(chatId, 'Meskhi House бот\n\n/tours — активные туры\n/prices — текущие цены\n/setroom 1 150 — изменить цену номера\n/settour 2 60 — изменить цену тура\n/setroomdate 1 2026-06-15 180 — цена номера на дату\n/settourdate 2 2026-06-15 70 — цена тура на дату\n/closedate 2026-06-15 ремонт — закрыть дату\n/closerange 2026-06-01 2026-06-15 ремонт — закрыть период\n/opendate 2026-06-15 — открыть дату\n/openrange 2026-06-01 2026-06-15 — открыть период\n/closed — закрытые даты\n/dynamic — статус динамических цен\n/dynamicoff — выключить динамические цены\n/dynamicon — включить динамические цены\n/setdynamic 75 20 — +20% при загрузке от 75%\n/bookings — все активные заявки\n/rooms — брони номеров\n/tourbookings — заявки на туры\n/uploadgallery — загрузить фото в главные фото сайта\n/uploadroomphoto 1 — загрузить фото номера\n/uploadtourphoto 2 — загрузить фото тура', keyboard);
    } else if (text === '/tours') {
        await tgSend(chatId, getToursInfo().map(t => `🎯 ${t.name}\n⏱ ${t.duration}\n💰 ${t.price}₾`).join('\n\n'), keyboard);
    } else if (text === '/prices') {
        const prices = loadPrices();
        const roomsText = Object.entries(prices.rooms).map(([id, r]) => `🏨 ${r.name}: ${r.price}₾ / ночь`).join('\n');
        const toursText = Object.entries(prices.tours).map(([id, t]) => `🎯 ${t.name}: ${t.price}₾`).join('\n');
        await tgSend(chatId, `Текущие цены:\n\n${roomsText}\n\n${toursText}\n\nИзменить:\n/setroom 1 150\n/settour 2 60`, keyboard);
    } else if (text.startsWith('/setroom ')) {
        const [, idRaw, priceRaw] = text.split(/\s+/);
        const id = String(idRaw || '');
        const price = Number(priceRaw);
        const prices = loadPrices();
        if (!prices.rooms[id] || !Number.isFinite(price) || price <= 0) {
            await tgSend(chatId, 'Формат: /setroom 1 150', keyboard);
            return;
        }
        prices.rooms[id].price = price;
        await savePrices(prices);
        await tgSend(chatId, `✅ Цена обновлена: ${prices.rooms[id].name} — ${price}₾ / ночь`, keyboard);
    } else if (text.startsWith('/settour ')) {
        const [, idRaw, priceRaw] = text.split(/\s+/);
        const id = String(idRaw || '');
        const price = Number(priceRaw);
        const prices = loadPrices();
        if (!prices.tours[id] || !Number.isFinite(price) || price <= 0) {
            await tgSend(chatId, 'Формат: /settour 2 60', keyboard);
            return;
        }
        prices.tours[id].price = price;
        await savePrices(prices);
        await tgSend(chatId, `✅ Цена обновлена: ${prices.tours[id].name} — ${price}₾`, keyboard);
    } else if (text.startsWith('/setroomdate ')) {
        const [, idRaw, dateRaw, priceRaw] = text.split(/\s+/);
        const id = String(idRaw || '');
        const date = String(dateRaw || '');
        const price = Number(priceRaw);
        const prices = loadPrices();
        if (!prices.rooms[id] || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(price) || price <= 0) {
            await tgSend(chatId, 'Формат: /setroomdate 1 2026-06-15 180', keyboard);
            return;
        }
        if (!prices.roomDatePrices[id]) prices.roomDatePrices[id] = {};
        prices.roomDatePrices[id][date] = price;
        await savePrices(prices);
        await tgSend(chatId, `✅ Цена на дату обновлена: ${prices.rooms[id].name}, ${formatRuDate(date)} — ${price}₾ / ночь`, keyboard);
    } else if (text.startsWith('/settourdate ')) {
        const [, idRaw, dateRaw, priceRaw] = text.split(/\s+/);
        const id = String(idRaw || '');
        const date = String(dateRaw || '');
        const price = Number(priceRaw);
        const prices = loadPrices();
        if (!prices.tours[id] || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(price) || price <= 0) {
            await tgSend(chatId, 'Формат: /settourdate 2 2026-06-15 70', keyboard);
            return;
        }
        if (!prices.tourDatePrices[id]) prices.tourDatePrices[id] = {};
        prices.tourDatePrices[id][date] = price;
        await savePrices(prices);
        await tgSend(chatId, `✅ Цена тура на дату обновлена: ${prices.tours[id].name}, ${formatRuDate(date)} — ${price}₾`, keyboard);
    } else if (text.startsWith('/closerange ')) {
        const parts = text.split(/\s+/);
        const from = String(parts[1] || '');
        const to = String(parts[2] || '');
        const reason = parts.slice(3).join(' ') || 'Закрыто администратором';
        const prices = loadPrices();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
            await tgSend(chatId, 'Формат: /closerange 2026-06-01 2026-06-15 ремонт', keyboard);
            return;
        }
        dateRange(from, to, true).forEach(date => prices.closedDates[date] = { reason, createdAt: new Date().toISOString() });
        await savePrices(prices);
        await tgSend(chatId, `✅ Закрыт период: ${formatRuDate(from)} — ${formatRuDate(to)}\nПричина: ${reason}`, keyboard);
    } else if (text.startsWith('/openrange ')) {
        const [, from, to] = text.split(/\s+/);
        const prices = loadPrices();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '')) {
            await tgSend(chatId, 'Формат: /openrange 2026-06-01 2026-06-15', keyboard);
            return;
        }
        dateRange(from, to, true).forEach(date => delete prices.closedDates[date]);
        await savePrices(prices);
        await tgSend(chatId, `✅ Открыт период: ${formatRuDate(from)} — ${formatRuDate(to)}`, keyboard);
    } else if (text === '/dynamic') {
        const prices = loadPrices();
        const rules = prices.occupancyRules || DEFAULT_PRICES.occupancyRules;
        const lines = (rules.thresholds || []).map(r => `• от ${r.occupancy}% загрузки: +${r.percent}%`).join('\n');
        await tgSend(chatId, `Динамические цены: ${rules.enabled ? 'включены' : 'выключены'}\n${lines}\n\n/dynamicoff — выключить\n/dynamicon — включить\n/setdynamic 75 20 — изменить правило`, keyboard);
    } else if (text === '/dynamicoff') {
        const prices = loadPrices();
        if (!prices.occupancyRules) prices.occupancyRules = { ...DEFAULT_PRICES.occupancyRules };
        prices.occupancyRules.enabled = false;
        await savePrices(prices);
        await tgSend(chatId, '✅ Динамические цены выключены. Теперь используются обычные цены и цены на конкретные даты.', keyboard);
    } else if (text === '/dynamicon') {
        const prices = loadPrices();
        if (!prices.occupancyRules) prices.occupancyRules = { ...DEFAULT_PRICES.occupancyRules };
        prices.occupancyRules.enabled = true;
        if (!Array.isArray(prices.occupancyRules.thresholds) || !prices.occupancyRules.thresholds.length) {
            prices.occupancyRules.thresholds = DEFAULT_PRICES.occupancyRules.thresholds;
        }
        await savePrices(prices);
        await tgSend(chatId, '✅ Динамические цены включены.', keyboard);
    } else if (text.startsWith('/setdynamic ')) {
        const [, occupancyRaw, percentRaw] = text.split(/\s+/);
        const occupancy = Number(occupancyRaw);
        const percent = Number(percentRaw);
        const prices = loadPrices();
        if (!Number.isFinite(occupancy) || !Number.isFinite(percent) || occupancy < 0 || occupancy > 100 || percent < 0) {
            await tgSend(chatId, 'Формат: /setdynamic 75 20', keyboard);
            return;
        }
        if (!prices.occupancyRules) prices.occupancyRules = DEFAULT_PRICES.occupancyRules;
        prices.occupancyRules.enabled = true;
        prices.occupancyRules.thresholds = (prices.occupancyRules.thresholds || []).filter(r => Number(r.occupancy) !== occupancy);
        prices.occupancyRules.thresholds.push({ occupancy, percent });
        prices.occupancyRules.thresholds.sort((a,b) => Number(a.occupancy) - Number(b.occupancy));
        await savePrices(prices);
        await tgSend(chatId, `✅ Правило динамической цены: от ${occupancy}% загрузки +${percent}%`, keyboard);
    } else if (text.startsWith('/closedate ')) {
        const parts = text.split(/\s+/);
        const date = String(parts[1] || '');
        const reason = parts.slice(2).join(' ') || 'Закрыто администратором';
        const prices = loadPrices();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            await tgSend(chatId, 'Формат: /closedate 2026-06-15 ремонт', keyboard);
            return;
        }
        prices.closedDates[date] = { reason, createdAt: new Date().toISOString() };
        await savePrices(prices);
        await tgSend(chatId, `✅ Дата закрыта для бронирования: ${formatRuDate(date)}
Причина: ${reason}`, keyboard);
    } else if (text.startsWith('/opendate ')) {
        const [, date] = text.split(/\s+/);
        const prices = loadPrices();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
            await tgSend(chatId, 'Формат: /opendate 2026-06-15', keyboard);
            return;
        }
        delete prices.closedDates[date];
        await savePrices(prices);
        await tgSend(chatId, `✅ Дата снова открыта: ${formatRuDate(date)}`, keyboard);
    } else if (text === '/closed') {
        const prices = loadPrices();
        const items = Object.entries(prices.closedDates || {}).sort(([a], [b]) => a.localeCompare(b));
        await tgSend(chatId, items.length ? items.map(([date, info]) => `🚫 ${formatRuDate(date)} — ${info.reason || 'закрыто'}`).join('\n') : 'Закрытых дат нет.', keyboard);
    } else if (text === '/uploadgallery') {
        state[chatId] = { kind: 'gallery' };
        await saveTgState(state);
        await tgSend(chatId, 'Пришлите фото следующим сообщением — я добавлю его в главные фото сайта.', keyboard);
    } else if (text.startsWith('/uploadroomphoto')) {
        const [, idRaw] = text.split(/\s+/);
        const id = String(idRaw || '');
        if (!DEFAULT_PRICES.rooms[id]) {
            await tgSend(chatId, 'Формат: /uploadroomphoto 1', keyboard);
            return;
        }
        state[chatId] = { kind: 'room', id };
        await saveTgState(state);
        await tgSend(chatId, `Пришлите фото следующим сообщением — я сохраню его для номера №${id}.`, keyboard);
    } else if (text.startsWith('/uploadtourphoto')) {
        const [, idRaw] = text.split(/\s+/);
        const id = String(idRaw || '');
        if (!DEFAULT_PRICES.tours[id]) {
            await tgSend(chatId, 'Формат: /uploadtourphoto 2', keyboard);
            return;
        }
        state[chatId] = { kind: 'tour', id };
        await saveTgState(state);
        await tgSend(chatId, `Пришлите фото следующим сообщением — я сохраню его для тура №${id}.`, keyboard);
    } else if (text === '/bookings') {
        await tgSend(chatId, buildBookingsText('all'), keyboard);
    } else if (text === '/rooms') {
        await tgSend(chatId, buildBookingsText('room'), keyboard);
    } else if (text === '/tourbookings') {
        await tgSend(chatId, buildBookingsText('tour'), keyboard);
    } else {
        await tgSend(chatId, 'Не понял команду. Нажмите /help.', keyboard);
    }
}

async function pollTelegram() {
    if (!isTelegramConfigured()) return;
    const botToken = process.env.TG_BOT_TOKEN;
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?timeout=5&offset=${tgOffset}`);
        const result = await response.json();
        if (result.ok) {
            for (const update of result.result) {
                tgOffset = update.update_id + 1;
                if (update.message) await handleTelegramMessage(update.message);
            }
        }
    } catch (e) {
        console.log('Telegram polling error:', e.message);
    }
}

initData().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 Сервер запущен!`);
        console.log(`📍 Публичная страница: http://localhost:${PORT}`);
        console.log(`🔐 Админ панель: http://localhost:${PORT}/admin.html`);
        console.log(`🔑 Пароль админа: ${process.env.ADMIN_PASSWORD}\n`);
        if (isTelegramConfigured()) setInterval(pollTelegram, 6000);
    });
}).catch(error => {
    console.error('❌ Ошибка инициализации Supabase:', error);
    process.exit(1);

});