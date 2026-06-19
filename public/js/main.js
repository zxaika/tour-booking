const ROOMS = {
    1: {
        id: 1,
        name: 'Номер №1',
        desc: 'Двухместный номер, окна выходят на улицу. Двуспальная кровать, кондиционер, вентилятор, шкаф, напольная вешалка, шторы блэкаут.',
        price: 120,
        icon: 'bed',
        bed: 'Двуспальная кровать',
        view: 'Улица',
        features: ['Кондиционер', 'Вентилятор', 'Шкаф', 'Напольная вешалка', 'Шторы блэкаут'],
        images: ['images/rooms/room-1-1.jpg', 'images/rooms/room-1-2.jpg', 'images/rooms/room-1-3.jpg', 'images/rooms/room-1-4.jpg']
    },
    2: {
        id: 2,
        name: 'Номер №2',
        desc: 'Двухместный номер, окна выходят на улицу. Двуспальная кровать, кондиционер, вентилятор, шкаф, фортепиано, шторы блэкаут.',
        price: 130,
        icon: 'music',
        bed: 'Двуспальная кровать',
        view: 'Улица',
        features: ['Кондиционер', 'Вентилятор', 'Шкаф', 'Фортепиано', 'Шторы блэкаут'],
        images: ['images/rooms/room-2-1.jpg', 'images/rooms/room-2-2.jpg', 'images/rooms/room-2-3.jpg', 'images/rooms/room-2-4.jpg']
    },
    3: {
        id: 3,
        name: 'Номер №3',
        desc: 'Двухместный номер, окна выходят во двор. Двуспальная кровать, кондиционер, вентилятор, туалетный столик с зеркалом, напольная вешалка, шторы блэкаут.',
        price: 110,
        icon: 'tree',
        bed: 'Двуспальная кровать',
        view: 'Двор',
        features: ['Кондиционер', 'Вентилятор', 'Туалетный столик с зеркалом', 'Напольная вешалка', 'Шторы блэкаут'],
        images: ['images/rooms/room-3-1.jpg', 'images/rooms/room-3-2.jpg', 'images/rooms/room-3-3.jpg', 'images/rooms/room-3-4.jpg']
    },
    4: {
        id: 4,
        name: 'Номер №4',
        desc: 'Двухместный номер, окна выходят во двор. Двуспальная кровать, кондиционер, вентилятор, шкаф, шторы блэкаут.',
        price: 110,
        icon: 'seedling',
        bed: 'Двуспальная кровать',
        view: 'Двор',
        features: ['Кондиционер', 'Вентилятор', 'Шкаф', 'Шторы блэкаут'],
        images: ['images/rooms/room-4-1.jpg', 'images/rooms/room-4-2.jpg', 'images/rooms/room-4-3.jpg', 'images/rooms/room-4-4.jpg']
    }
};

const EXTRA_MEDIA = [
    ...Array.from({ length: 16 }, (_, i) => ({
        type: 'image',
        src: `images/mainimg/photo-${String(i + 1).padStart(2, '0')}.jpg`,
        title: `Фото ${i + 1}`
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
        type: 'video',
        src: `videos/gallery/video-${String(i + 1).padStart(2, '0')}.mp4`,
        title: `Видео ${i + 1}`
    }))
];

const TOURS = [
    { id: 1, image: 'images/tours/tour-svan-towers.jpg', video: 'videos/tours/tour-svan-towers.mp4', name: 'Сванские башни', desc: 'Двухдневное приключение в Местиа: древние сванские села, ледник, башни, кубдари и ночёвка у местных.', price: 300, duration: '2 дня', days: 2, icon: 'mountain', highlights: ['Сванская культура', 'Горы, башни и ледники', 'Настоящая домашняя еда'] },
    { id: 2, image: 'images/tours/tour-port-city.png', video: 'videos/tours/tour-port-city.mp4', name: 'Портовый город', desc: 'Атмосферная прогулка по Поти: порт, маяк, колоритный центр, символьная фотоистория и ощущение жизни у моря.', price: 50, duration: '2–3 часа', days: 1, icon: 'anchor', highlights: ['Порт и маяк', 'Короткий формат', 'История города'] },
    { id: 3, image: 'images/tours/tour-hot-springs.jpg', video: 'videos/tours/tour-hot-springs.mp4', name: 'Горячие источники', desc: 'Целый день релакса в целебных серных водах и гастрономическое путешествие с мегрельским обедом.', price: 120, duration: '1 день', days: 1, icon: 'spa', highlights: ['Серные источники', 'Древний руинированный храм', 'Мегрельская кухня'] },
    { id: 4, image: 'images/tours/tour-sunset.jpg', video: 'videos/tours/tour-sunset.mp4', name: 'Закат над облаками', desc: 'Подъём выше небес в Гомис Мта: море облаков, горные виды и закат, который остаётся в памяти.', price: 90, duration: '3–4 часа', days: 1, icon: 'cloud-sun', highlights: ['Невероятные фото', 'Тишина и красота', 'Можно с ночёвкой'] },
    { id: 5, image: 'images/tours/tour-cave.jpg', video: 'videos/tours/tour-cave.mp4', name: 'Подземное царство', desc: 'Маршрут среди сталактитов, пещер, водопадов и природных чаш с кристально чистой водой.', price: 80, duration: '4–5 часов', days: 1, icon: 'water', highlights: ['Пещера и водопады', 'Лёгкий маршрут', 'Купание в природных чашах'] }
];

let bookedDates = {};
let priceRules = { roomDatePrices: {}, tourDatePrices: {}, closedDates: {} };

// ========== ДОБАВЛЕННАЯ ФУНКЦИЯ hasClosedDates ДЛЯ КЛИЕНТА ==========
function hasClosedDates(checkIn, checkOut, type, prices) {
    const closedDates = prices?.closedDates || {};
    const dates = [];
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    // Проверяем все даты в диапазоне
    while (start < end) {
        const dateStr = toLocalDateString(start);
        if (closedDates[dateStr]) {
            return dateStr;
        }
        start.setDate(start.getDate() + 1);
    }
    return null;
}
// ========== КОНЕЦ ДОБАВЛЕННОЙ ФУНКЦИИ ==========

// ========== ФУНКЦИИ РАБОТЫ С ДАТАМИ ==========
function toLocalDateString(date) {
    // Если это уже строка в формате YYYY-MM-DD, возвращаем как есть
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }
    // Если это Date объект
    if (date instanceof Date && !isNaN(date)) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    // Пробуем распарсить строку
    try {
        const parsed = new Date(date);
        if (!isNaN(parsed)) {
            const y = parsed.getFullYear();
            const m = String(parsed.getMonth() + 1).padStart(2, '0');
            const d = String(parsed.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    } catch (e) {}
    return String(date);
}

function parseLocalDate(dateString) {
    if (dateString instanceof Date) return normalizeDate(dateString);
    const str = String(dateString);
    // Если строка уже в формате YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    // Пробуем распарсить через Date
    const parsed = new Date(str);
    if (!isNaN(parsed)) return normalizeDate(parsed);
    return new Date();
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function normalizeDate(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// ========== КОНЕЦ ФУНКЦИЙ РАБОТЫ С ДАТАМИ ==========

async function loadPrices() {
    try {
        const response = await fetch('/api/prices');
        const prices = await response.json();
        Object.entries(prices.rooms || {}).forEach(([id, room]) => {
            if (ROOMS[id]) ROOMS[id].price = Number(room.price || ROOMS[id].price);
        });
        priceRules = prices;
        Object.entries(prices.tours || {}).forEach(([id, tourPrice]) => {
            const tour = TOURS.find(t => String(t.id) === String(id));
            if (tour) tour.price = Number(tourPrice.price || tour.price);
        });
    } catch (error) {
        console.error('Ошибка загрузки цен:', error);
    }
}

async function loadBookedDates() {
    try {
        const response = await fetch('/api/booked-dates');
        bookedDates = await response.json();
    } catch (error) {
        console.error('Ошибка загрузки дат:', error);
    }
}

async function getQuote(payload) {
    const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const text = await response.text();

    let result = {};
    try {
        result = text ? JSON.parse(text) : {};
    } catch (e) {
        console.error('Некорректный ответ /api/quote:', text);
        throw new Error('Сервер вернул ошибку. Проверь логи Vercel.');
    }

    if (!response.ok) {
        console.error('/api/quote error:', result);
        throw new Error(result.error || 'Дата недоступна');
    }

    return Number(result.total || 0);
}

function getClosedDateList() {
    return Object.keys(priceRules.closedDates || {});
}

function createRoomCalendar(roomId, roomPrice) {
    const calendarDiv = document.createElement('div');
    calendarDiv.className = 'calendar-wrapper';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '📅 Выберите даты заезда и выезда';
    input.className = 'date-input';
    input.readOnly = true;
    calendarDiv.appendChild(input);

    const bookedForRoom = bookedDates[roomId] || [];

    const picker = flatpickr(input, {
        mode: 'range',
        dateFormat: 'Y-m-d',
        locale: 'ru',
        minDate: 'today',
        disable: bookedForRoom,
        onChange: async (selectedDates, dateStr, instance) => {
            if (selectedDates.length === 2) {
                const checkIn = normalizeDate(selectedDates[0]);
                const checkOut = normalizeDate(selectedDates[1]);
                const nights = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));

                if (nights <= 0) {
                    alert('Выберите минимум одну ночь');
                    instance.clear();
                    return;
                }

                const checkInStr = toLocalDateString(checkIn);
                const checkOutStr = toLocalDateString(checkOut);

                // Проверяем закрытые даты и считаем цену через сервер
                let total = roomPrice * nights;
                try {
                    total = await getQuote({ type: 'room', roomId, checkIn: checkInStr, checkOut: checkOutStr });
                } catch (error) {
                    alert('❌ ' + error.message);
                    instance.clear();
                    return;
                }

                const response = await fetch('/api/check-availability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId, checkIn: checkInStr, checkOut: checkOutStr })
                });
                const result = await response.json();

                if (result.available) {
                    showBookingForm('room', roomId, ROOMS[roomId].name, roomPrice, checkInStr, checkOutStr, nights, total);
                } else {
                    alert('❌ ' + (result.reason || 'К сожалению, эти даты уже заняты. Выберите другие.'));
                    instance.clear();
                }
            }
        }
    });

    calendarDiv.picker = picker;
    return calendarDiv;
}

function createTourCalendar(tour) {
    const calendarDiv = document.createElement('div');
    calendarDiv.className = 'calendar-wrapper tour-calendar-wrapper';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '📅 Выберите дату тура';
    input.className = 'date-input tour-date-input';
    input.readOnly = true;
    calendarDiv.appendChild(input);

    flatpickr(input, {
        mode: 'single',
        dateFormat: 'Y-m-d',
        locale: 'ru',
        minDate: 'today',
        disable: getClosedDateList(),
        onChange: async (selectedDates, dateStr, instance) => {
            if (selectedDates.length === 1) {
                const checkIn = normalizeDate(selectedDates[0]);
                const daysCount = tour.days || 1;
                const checkOut = new Date(checkIn);
                checkOut.setDate(checkOut.getDate() + Math.max(daysCount - 1, 0));
                const checkInStr = toLocalDateString(checkIn);
                const checkOutStr = toLocalDateString(checkOut);

                let total = tour.price;
                try {
                    total = await getQuote({ type: 'tour', tourId: tour.id, tourName: tour.name, checkIn: checkInStr, checkOut: checkOutStr });
                } catch (error) {
                    alert('❌ ' + error.message);
                    instance.clear();
                    return;
                }
                showBookingForm('tour', tour.id, tour.name, tour.price, checkInStr, checkOutStr, daysCount, total);
            }
        }
    });

    return calendarDiv;
}

function showBookingForm(type, id, name, price, checkInDate, checkOutDate, nights, total) {
    const checkInStr = String(checkInDate);
    const checkOutStr = String(checkOutDate);
    const formattedCheckIn = formatDate(checkInStr);
    const formattedCheckOut = formatDate(checkOutStr);
    const typeText = type === 'tour' ? 'Тур' : 'Номер';
    const dateText = type === 'tour'
        ? (nights > 1 ? `${formattedCheckIn} — ${formattedCheckOut}` : formattedCheckIn)
        : `${formattedCheckIn} — ${formattedCheckOut}`;
    const priceText = type === 'tour' ? `${total}₾` : `${total}₾ за ${nights} ноч.`;

    const formHtml = `
        <div class="booking-form-overlay" id="bookingFormOverlay">
            <div class="booking-form-card">
                <button class="close-form" onclick="closeBookingForm()">×</button>
                <h3><i class="fas fa-calendar-check"></i> Бронирование ${typeText}: ${name}</h3>
                <div class="booking-summary">
                    <p><strong>📅 ${type === 'tour' ? 'Дата тура' : 'Даты'}:</strong> ${dateText}</p>
                    <p><strong>💰 Стоимость:</strong> ${priceText}</p>
                </div>
                <form id="bookingForm">
                    <input type="hidden" id="formType" value="${type}">
                    <input type="hidden" id="formId" value="${id}">
                    <input type="hidden" id="formName" value="${name}">
                    <input type="hidden" id="formCheckIn" value="${checkInStr}">
                    <input type="hidden" id="formCheckOut" value="${checkOutStr}">
                    <input type="hidden" id="formTotal" value="${total}">
                    
                    <div class="form-group">
                        <label><i class="fas fa-user"></i> Ваше имя *</label>
                        <input type="text" id="guestName" required placeholder="Иван Иванов">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-phone"></i> Телефон *</label>
                        <input type="tel" id="guestPhone" required placeholder="+7 999 123-45-67">
                    </div>
                    <div class="form-group">
                        <label><i class="fab fa-telegram"></i> Telegram (для быстрой связи)</label>
                        <input type="text" id="guestTelegram" placeholder="@username или номер телефона">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-envelope"></i> Email</label>
                        <input type="email" id="guestEmail" placeholder="ivan@example.com">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-users"></i> Количество гостей *</label>
                        <select id="guestsCount">
                            <option value="1">1 гость</option>
                            <option value="2" selected>2 гостя</option>
                            <option value="3">3 гостя</option>
                            <option value="4">4 гостя</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-comment"></i> Пожелания</label>
                        <textarea id="notes" rows="2" placeholder="Особые пожелания..."></textarea>
                    </div>
                    <button type="submit" class="btn-submit">✅ Забронировать</button>
                </form>
            </div>
        </div>
    `;

    closeBookingForm();
    document.body.insertAdjacentHTML('beforeend', formHtml);
    document.getElementById('bookingForm').addEventListener('submit', submitBooking);
}

function closeBookingForm() {
    const overlay = document.getElementById('bookingFormOverlay');
    if (overlay) overlay.remove();
}

async function submitBooking(e) {
    e.preventDefault();

    const type = document.getElementById('formType').value;
    const id = parseInt(document.getElementById('formId').value);
    const name = document.getElementById('formName').value;

    const checkIn = document.getElementById('formCheckIn').value;
    const checkOut = document.getElementById('formCheckOut').value;

    const bookingData = {
        type: type,
        roomId: type === 'room' ? id : null,
        roomName: type === 'room' ? name : null,
        tourId: type === 'tour' ? id : null,
        tourName: type === 'tour' ? name : null,
        guestName: document.getElementById('guestName').value,
        guestPhone: document.getElementById('guestPhone').value,
        guestTelegram: document.getElementById('guestTelegram').value,
        guestEmail: document.getElementById('guestEmail').value,
        guestsCount: parseInt(document.getElementById('guestsCount').value),
        checkIn: checkIn,
        checkOut: checkOut,
        totalPrice: parseInt(document.getElementById('formTotal').value),
        notes: document.getElementById('notes').value
    };

    if (!bookingData.guestName || !bookingData.guestPhone) {
        alert('Пожалуйста, заполните имя и телефон');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Отправка...';

    try {
        console.log('BOOKING DATA:', bookingData);

        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        const text = await response.text();
        let result = {};
        try {
            result = text ? JSON.parse(text) : {};
        } catch (parseError) {
            console.error('Некорректный ответ /api/bookings:', text);
            throw new Error('Сервер вернул некорректный ответ');
        }

        console.log('BOOKING RESPONSE:', response.status, result);

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Попробуйте позже');
        }

        alert('✅ Бронирование успешно создано! Мы свяжемся с вами для подтверждения.');
        closeBookingForm();
        await loadBookedDates();
        location.reload();
    } catch (error) {
        console.error('Ошибка бронирования:', error);
        alert('❌ Ошибка: ' + (error.message || 'Ошибка подключения к серверу'));
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ Забронировать';
    }
}

// ========== ОСТАЛЬНЫЕ ФУНКЦИИ ==========

async function loadRoomMedia() {
    try {
        const response = await fetch('/api/room-media');
        const data = await response.json();
        Object.entries(data.rooms || {}).forEach(([id, images]) => {
            if (!ROOMS[id] || !Array.isArray(images)) return;
            const current = ROOMS[id].images || [];
            ROOMS[id].images = [...new Set([...images, ...current])];
        });
    } catch (error) {
        console.error('Ошибка загрузки фото номеров:', error);
    }
}

async function loadTourMedia() {
    try {
        const response = await fetch('/api/tour-media');
        const data = await response.json();
        Object.entries(data.tours || {}).forEach(([id, images]) => {
            const tour = TOURS.find(t => String(t.id) === String(id));
            if (tour && Array.isArray(images) && images.length) tour.image = images[0];
        });
    } catch (error) {
        console.error('Ошибка загрузки фото туров:', error);
    }
}

function createRoomGallery(room) {
    const media = (room.images || []).map(src => ({ type: 'image', src }));
    const slides = media.map((item, index) => `
        <div class="room-slide ${index === 0 ? 'active' : ''}" data-slide="${index}">
            <img src="${item.src}" alt="${room.name} — фото ${index + 1}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="room-photo-placeholder" style="display:none;">
                <i class="fas fa-camera"></i>
                <span>Фото ${index + 1}</span>
                <small>${item.src}</small>
            </div>
        </div>
    `).join('');

    const dots = media.map((_, index) => `
        <button type="button" class="room-gallery-dot ${index === 0 ? 'active' : ''}" aria-label="Показать медиа ${index + 1}" onclick="showRoomSlide(${room.id}, ${index})"></button>
    `).join('');

    return `
        <div class="room-gallery" data-room-gallery="${room.id}" data-current="0">
            <div class="room-gallery-track">${slides}</div>
            <button type="button" class="room-gallery-btn prev" aria-label="Предыдущее фото" onclick="changeRoomSlide(${room.id}, -1)"><i class="fas fa-chevron-left"></i></button>
            <button type="button" class="room-gallery-btn next" aria-label="Следующее фото" onclick="changeRoomSlide(${room.id}, 1)"><i class="fas fa-chevron-right"></i></button>
            <div class="room-gallery-dots">${dots}</div>
        </div>
    `;
}

function showRoomSlide(roomId, slideIndex) {
    const gallery = document.querySelector(`[data-room-gallery="${roomId}"]`);
    if (!gallery) return;
    const slides = gallery.querySelectorAll('.room-slide');
    const dots = gallery.querySelectorAll('.room-gallery-dot');
    if (!slides.length) return;

    const nextIndex = (slideIndex + slides.length) % slides.length;
    slides.forEach((slide, index) => slide.classList.toggle('active', index === nextIndex));
    dots.forEach((dot, index) => dot.classList.toggle('active', index === nextIndex));
    gallery.dataset.current = String(nextIndex);
}

function changeRoomSlide(roomId, direction) {
    const gallery = document.querySelector(`[data-room-gallery="${roomId}"]`);
    if (!gallery) return;
    const current = Number(gallery.dataset.current || 0);
    showRoomSlide(roomId, current + direction);
}

async function renderRooms() {
    await loadBookedDates();

    const grid = document.getElementById('roomsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let id in ROOMS) {
        const r = ROOMS[id];
        const bookedDatesList = bookedDates[r.id] || [];

        const card = document.createElement('div');
        card.className = 'room-card';
        card.dataset.roomCard = String(r.id);
        card.innerHTML = `
            ${createRoomGallery(r)}
            <div class="room-info">
                <h3 class="room-name">${r.name}</h3>
                <p class="room-desc">${r.desc}</p>
                <div class="room-details">
                    <span><i class="fas fa-bed"></i> ${r.bed}</span>
                    <span><i class="fas fa-eye"></i> ${r.view}</span>
                </div>
                <ul class="feature-list">${r.features.map(f => `<li>${f}</li>`).join('')}</ul>
                <div class="price">${r.price}₾ / ночь</div>
                <div class="calendar-container" data-room="${r.id}"></div>
                ${bookedDatesList.length > 0 ? `<div class="booked-warning">Занято: ${bookedDatesList.length} дней</div>` : ''}
            </div>
        `;
        grid.appendChild(card);

        const calendarContainer = card.querySelector('.calendar-container');
        const calendar = createRoomCalendar(r.id, r.price);
        calendarContainer.appendChild(calendar);
    }
}

let extraMediaItems = [...EXTRA_MEDIA];
let mediaAutoTimer = null;
let availabilitySelectedRange = [];

async function loadExtraMedia() {
    try {
        const response = await fetch('/api/media');
        const data = await response.json();
        if (Array.isArray(data.media) && data.media.length) {
            const known = new Set(EXTRA_MEDIA.map(item => item.src));
            const uploaded = data.media.filter(item => !known.has(item.src));
            extraMediaItems = [...uploaded, ...EXTRA_MEDIA];
        }
    } catch (error) {
        extraMediaItems = [...EXTRA_MEDIA];
    }
}

function renderExtraMedia() {
    const grid = document.getElementById('extraMediaGrid');
    if (!grid) return;
    grid.className = 'media-slider';
    grid.innerHTML = `
        <div class="media-slider-window">
            <div class="media-slider-track" id="mediaSliderTrack">
                ${extraMediaItems.map((item, index) => {
        const isVideo = item.type === 'video';
        return `
                        <article class="media-slide" data-media-index="${index}">
                            ${isVideo
            ? `<video src="${item.src}" controls muted playsinline preload="metadata"></video><div class="media-caption"><i class="fas fa-video"></i> ${item.title || 'Видео'} · ${item.src}</div>`
            : `<img src="${item.src}" alt="${item.title || 'Фото'}" onclick="openMediaFullscreen(${index})" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="media-placeholder" style="display:none;"><i class="fas fa-camera"></i><span>${item.title || 'Фото'}</span><small>${item.src}</small></div>`}
                        </article>
                    `;
    }).join('')}
            </div>
        </div>
        <button type="button" class="media-nav prev" onclick="changeMediaSlide(-1)"><i class="fas fa-chevron-left"></i></button>
        <button type="button" class="media-nav next" onclick="changeMediaSlide(1)"><i class="fas fa-chevron-right"></i></button>
    `;
    setMediaSlide(0);
    startMediaAutoplay();
}

function setMediaSlide(index) {
    const track = document.getElementById('mediaSliderTrack');
    if (!track || !extraMediaItems.length) return;
    const next = (index + extraMediaItems.length) % extraMediaItems.length;
    track.dataset.current = String(next);
    track.style.transform = `translateX(-${next * 100}%)`;
}

function changeMediaSlide(direction) {
    const track = document.getElementById('mediaSliderTrack');
    const current = Number(track?.dataset.current || 0);
    setMediaSlide(current + direction);
    startMediaAutoplay();
}

function startMediaAutoplay() {
    if (mediaAutoTimer) clearInterval(mediaAutoTimer);
    mediaAutoTimer = setInterval(() => changeMediaSlide(1), 4500);
}

function openMediaFullscreen(index) {
    const item = extraMediaItems[index];
    if (!item || item.type !== 'image') return;
    const overlay = document.createElement('div');
    overlay.className = 'media-fullscreen';
    overlay.innerHTML = `<button onclick="this.parentElement.remove()">×</button><img src="${item.src}" alt="${item.title || 'Фото'}">`;
    document.body.appendChild(overlay);
}

function initAvailabilitySearch() {
    const input = document.getElementById('availabilityDates');
    if (!input || input._flatpickr) return;
    flatpickr(input, {
        mode: 'range',
        minDate: 'today',
        dateFormat: 'Y-m-d',
        locale: 'ru',
        onChange(selectedDates) {
            availabilitySelectedRange = selectedDates;
        }
    });
}

async function searchAvailableRooms() {
    const resultBox = document.getElementById('availableRoomsResult');
    if (!resultBox) return;
    if (!availabilitySelectedRange || availabilitySelectedRange.length < 2) {
        resultBox.innerHTML = 'Выберите дату заезда и выезда.';
        return;
    }
    const checkIn = toLocalDateString(availabilitySelectedRange[0]);
    const checkOut = toLocalDateString(availabilitySelectedRange[1]);
    resultBox.innerHTML = 'Ищем свободные номера...';
    try {
        const response = await fetch(`/api/available-rooms?checkIn=${checkIn}&checkOut=${checkOut}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Ошибка поиска');
        const roomCards = document.querySelectorAll('.room-card');
        roomCards.forEach(card => card.style.display = 'none');
        if (!data.rooms.length) {
            resultBox.innerHTML = 'На эти даты свободных номеров нет.';
            return;
        }
        data.rooms.forEach(room => {
            const card = document.querySelector(`[data-room-card="${room.id}"]`);
            if (card) card.style.display = '';
        });
        resultBox.innerHTML = `<strong>Свободно: ${data.rooms.length}</strong> · ${formatDate(checkIn)} — ${formatDate(checkOut)} · ${data.nights} ноч.` +
            data.rooms.map(room => `<button type="button" onclick="showBookingForm('room', ${room.id}, '${room.name}', ${room.price}, '${checkIn}', '${checkOut}', ${data.nights}, ${room.total})">${room.name} — ${room.total}₾</button>`).join('');
    } catch (error) {
        resultBox.innerHTML = 'Ошибка: ' + error.message;
    }
}

function resetAvailableRooms() {
    document.querySelectorAll('.room-card').forEach(card => card.style.display = '');
    const resultBox = document.getElementById('availableRoomsResult');
    if (resultBox) resultBox.innerHTML = '';
    const input = document.getElementById('availabilityDates');
    if (input && input._flatpickr) input._flatpickr.clear();
    availabilitySelectedRange = [];
}

function renderTours() {
    const grid = document.getElementById('toursGrid');
    if (!grid) return;
    grid.innerHTML = '';

    TOURS.forEach(tour => {
        const card = document.createElement('div');
        card.className = 'tour-card';
        card.innerHTML = `
            <div class="tour-photo tour-media">
                <img src="${tour.image}" alt="${tour.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="tour-photo-placeholder" style="display:none;"><i class="fas fa-${tour.icon}"></i><span>Фото тура</span><small>${tour.image}</small></div>
                <details class="tour-video-box"><summary><i class="fas fa-play-circle"></i> Видео тура</summary><video src="${tour.video}" controls muted playsinline preload="metadata"></video><small>${tour.video}</small></details>
            </div>
            <div class="tour-card-content">
                <i class="fas fa-${tour.icon}"></i>
                <h3>${tour.name}</h3>
                <p>${tour.desc}</p>
                <ul class="tour-highlights">${tour.highlights.map(h => `<li>${h}</li>`).join('')}</ul>
                <div class="tour-duration"><i class="fas fa-clock"></i> ${tour.duration}</div>
                <div class="tour-price">${tour.price}₾</div>
            </div>
            <div class="tour-calendar-container"></div>
        `;

        grid.appendChild(card);
        card.querySelector('.tour-calendar-container').appendChild(createTourCalendar(tour));
    });
}

function initScrollWineBottle() {
    const bottle = document.querySelector('.scroll-wine');
    if (!bottle) return;

    const updateWineLevel = () => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
        const level = Math.max(0, Math.min(100, 100 - progress * 100));
        document.documentElement.style.setProperty('--wine-level', `${level}%`);
    };

    updateWineLevel();
    window.addEventListener('scroll', updateWineLevel, { passive: true });
    window.addEventListener('resize', updateWineLevel);
}

document.querySelectorAll('.nav-links a, .admin-link').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

(async () => {
    await loadPrices();
    await loadRoomMedia();
    await loadTourMedia();
    await renderRooms();
    initAvailabilitySearch();
    await loadExtraMedia();
    renderExtraMedia();
    renderTours();
    initScrollWineBottle();
})();