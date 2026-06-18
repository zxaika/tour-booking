let adminUsername = '';
let adminPassword = '';
let currentFilter = 'all';
let allBookings = [];
let calendarDays = {};
let adminCalendarDate = new Date();

function formatLocalDate(dateString) {
    if (!dateString) return '';
    const [year, month, day] = String(dateString).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('ru-RU');
}

async function login() {
    const username = document.getElementById('adminUsername')?.value || '';
    const password = document.getElementById('adminPassword').value;
    if (!username || !password) {
        showNotification('Введите логин и пароль', 'error');
        return;
    }
    adminUsername = username;
    adminPassword = password;

    try {
        const response = await fetch('/api/admin/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: adminUsername, password: adminPassword })
        });

        if (!response.ok) {
            showNotification('Неверный пароль', 'error');
            return;
        }

        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('adminSection').style.display = 'block';

        await loadStats();
        await loadBookings();
        await loadAdminCalendar();

        showNotification('Вход выполнен успешно', 'success');
    } catch (error) {
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

async function loadStats() {
    try {
        const response = await fetch('/api/admin/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: adminUsername, password: adminPassword })
        });

        if (!response.ok) throw new Error();

        const stats = await response.json();
        document.getElementById('totalStats').textContent = stats.total || 0;
        document.getElementById('activeStats').textContent = stats.active || 0;
        document.getElementById('cancelledStats').textContent = stats.cancelled || 0;
        document.getElementById('revenueStats').textContent = `${stats.revenue || 0}₾`;
        document.getElementById('monthRevenueStats').textContent = `${stats.monthRevenue || 0}₾`;
        document.getElementById('futureRevenueStats').textContent = `${stats.futureRevenue || 0}₾`;
        const analytics = document.getElementById('analyticsSummary');
        if (analytics) analytics.innerHTML = `<span>Средний чек: <strong>${stats.avgBooking || 0}₾</strong></span><span>Активных заявок: <strong>${stats.active || 0}</strong></span><span>Доход будущих дат: <strong>${stats.futureRevenue || 0}₾</strong></span>`;
    } catch (error) {
        showNotification('Ошибка загрузки статистики', 'error');
    }
}

async function loadBookings() {
    try {
        const response = await fetch('/api/admin/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: adminUsername, password: adminPassword, filter: currentFilter })
        });

        if (!response.ok) throw new Error();

        const data = await response.json();
        allBookings = data.bookings || [];
        applySortingAndFilters();
    } catch (error) {
        showNotification('Ошибка загрузки бронирований', 'error');
    }
}

function applySortingAndFilters() {
    const typeFilter = document.getElementById('typeFilter')?.value || 'all';
    const sortMode = document.getElementById('dateSort')?.value || 'createdDesc';
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';

    let bookings = [...allBookings];

    if (typeFilter !== 'all') {
        bookings = bookings.filter(b => (b.type || 'room') === typeFilter);
    }

    if (searchTerm) {
        bookings = bookings.filter(b => [
            b.id,
            b.type === 'tour' ? 'тур' : 'номер',
            b.tourName,
            b.roomName,
            b.guestName,
            b.guestPhone,
            b.guestTelegram,
            b.guestEmail,
            b.checkIn,
            b.checkOut,
            b.status
        ].join(' ').toLowerCase().includes(searchTerm));
    }

    const getTime = (value) => value ? new Date(value).getTime() : 0;
    bookings.sort((a, b) => {
        switch (sortMode) {
            case 'createdAsc': return getTime(a.createdAt) - getTime(b.createdAt);
            case 'checkInAsc': return getTime(a.checkIn) - getTime(b.checkIn);
            case 'checkInDesc': return getTime(b.checkIn) - getTime(a.checkIn);
            case 'checkOutAsc': return getTime(a.checkOut) - getTime(b.checkOut);
            case 'checkOutDesc': return getTime(b.checkOut) - getTime(a.checkOut);
            case 'createdDesc':
            default: return getTime(b.createdAt) - getTime(a.createdAt);
        }
    });

    renderBookingsTable(bookings);
}

function renderBookingsTable(bookings) {
    const tbody = document.getElementById('bookingsTableBody');
    if (!tbody) return;

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="empty-state"><i class="fas fa-calendar-check"></i><p>Нет бронирований по выбранным условиям</p></td></tr>`;
        return;
    }

    tbody.innerHTML = '';

    bookings.forEach(booking => {
        const row = tbody.insertRow();
        row.dataset.type = booking.type || 'room';
        row.dataset.checkIn = booking.checkIn || '';
        row.dataset.checkOut = booking.checkOut || '';
        row.dataset.createdAt = booking.createdAt || '';

        const checkInDate = formatLocalDate(booking.checkIn);
        const checkOutDate = formatLocalDate(booking.checkOut);
        const createdAt = new Date(booking.createdAt).toLocaleString('ru-RU');
        const statusClass = booking.status === 'confirmed' ? 'status-confirmed' : 'status-cancelled';
        const statusText = booking.status === 'confirmed' ? 'Подтверждено' : 'Отменено';
        const typeText = booking.type === 'tour' ? 'Тур' : 'Номер';
        const itemName = booking.type === 'tour' ? booking.tourName : booking.roomName;
        const datesText = booking.type === 'tour'
            ? `${checkInDate}${booking.checkOut && booking.checkOut !== booking.checkIn ? `<br>до ${checkOutDate}` : ''}`
            : `${checkInDate}<br>→ ${checkOutDate}`;

        row.innerHTML = `
            <td><strong>#${booking.id}</strong><br><span class="booking-date-small">${createdAt}</span></td>
            <td>${typeText}</td>
            <td>${escapeHtml(itemName)}</td>
            <td>${escapeHtml(booking.guestName)}</td>
            <td>${escapeHtml(booking.guestPhone)}</td>
            <td>${escapeHtml(booking.guestTelegram) || '—'}</td>
            <td>${escapeHtml(booking.guestEmail) || '—'}</td>
            <td>${datesText}</td>
            <td>${booking.guestsCount}</td>
            <td><strong>${booking.totalPrice}₾</strong></td>
            <td><span class="${statusClass}">${statusText}</span></td>
            <td class="actions-cell">
                <button onclick="downloadReceipt(${booking.id})" class="action-btn receipt-btn">PDF-чек</button>
                ${booking.status === 'confirmed' ? `<button onclick="cancelBooking(${booking.id})" class="action-btn cancel-btn">Отменить</button>` : ''}
                <button onclick="deleteBooking(${booking.id})" class="action-btn delete-btn">Удалить</button>
            </td>
        `;
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function cancelBooking(bookingId) {
    if (!confirm('Отменить это бронирование?')) return;

    try {
        const response = await fetch('/api/admin/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: adminUsername, password: adminPassword, bookingId })
        });

        if (!response.ok) throw new Error();

        showNotification('Бронирование отменено', 'success');
        await loadBookings();
        await loadStats();
        await loadAdminCalendar();
    } catch (error) {
        showNotification('Ошибка отмены', 'error');
    }
}

async function deleteBooking(bookingId) {
    if (!confirm('⚠️ Удалить бронирование навсегда?')) return;

    try {
        const response = await fetch('/api/admin/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: adminUsername, password: adminPassword, bookingId })
        });

        if (!response.ok) throw new Error();

        showNotification('Бронирование удалено', 'success');
        await loadBookings();
        await loadStats();
        await loadAdminCalendar();
    } catch (error) {
        showNotification('Ошибка удаления', 'error');
    }
}

async function refreshData() {
    showNotification('Обновление...', 'info');
    await loadBookings();
    await loadStats();
    await loadAdminCalendar();
    showNotification('Обновлено', 'success');
}

function setFilter(days, button) {
    currentFilter = days;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (button) button.classList.add('active');
    loadBookings();
}

function filterBookings() {
    applySortingAndFilters();
}


async function loadAdminCalendar() {
    try {
        const response = await fetch('/api/admin/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: adminUsername, password: adminPassword })
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        calendarDays = data.days || {};
        renderAdminCalendar();
    } catch (error) {
        showNotification('Ошибка загрузки календаря', 'error');
    }
}

function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function renderAdminCalendar() {
    const grid = document.getElementById('adminCalendar');
    const title = document.getElementById('adminCalendarTitle');
    if (!grid || !title) return;

    const year = adminCalendarDate.getFullYear();
    const month = adminCalendarDate.getMonth();
    title.textContent = new Date(year, month, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    const first = new Date(year, month, 1);
    const start = new Date(first);
    const firstDay = (first.getDay() + 6) % 7;
    start.setDate(first.getDate() - firstDay);

    const weekDays = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    grid.innerHTML = weekDays.map(d => `<div class="calendar-weekday">${d}</div>`).join('');

    for (let i = 0; i < 42; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        const key = dateKey(day);
        const items = calendarDays[key] || [];
        const classes = ['calendar-day'];
        if (day.getMonth() !== month) classes.push('muted');
        if (items.length) classes.push('busy');

        const itemsHtml = items.map(item => `
            <div class="calendar-booking ${item.type === 'tour' ? 'tour' : item.type === 'closed' ? 'closed' : 'room'}" draggable="${item.type !== 'closed'}" data-booking-id="${item.id}" title="${escapeHtml(item.itemName)} — ${escapeHtml(item.guestPhone)}" ondragstart="startBookingDrag(event, '${item.id}')">
                <span>${item.type === 'tour' ? '🎯' : '🏨'} ${escapeHtml(item.itemName || '')}</span>
                <strong>${escapeHtml(item.guestName || '')}</strong>
            </div>
        `).join('');

        grid.insertAdjacentHTML('beforeend', `
            <div class="${classes.join(' ')}" data-date="${key}" ondragover="allowCalendarDrop(event)" ondrop="dropBookingToDate(event, '${key}')">
                <div class="day-number">${day.getDate()}</div>
                ${itemsHtml || '<span class="free-day">свободно</span>'}
            </div>
        `);
    }
}

function changeAdminMonth(direction) {
    adminCalendarDate.setMonth(adminCalendarDate.getMonth() + direction);
    renderAdminCalendar();
}

function exportToExcel() {
    const rows = document.querySelectorAll('#bookingsTableBody tr');
    const data = [];

    data.push(['ID', 'Тип', 'Название', 'Гость', 'Телефон', 'Telegram', 'Email', 'Заезд', 'Выезд', 'Гостей', 'Стоимость', 'Статус', 'Дата создания']);

    rows.forEach(row => {
        if (row.cells.length < 11 || row.style.display === 'none') return;

        data.push([
            row.cells[0]?.textContent?.match(/#(\d+)/)?.[1] || '',
            row.cells[1]?.textContent?.trim() || '',
            row.cells[2]?.textContent?.trim() || '',
            row.cells[3]?.textContent?.replace('👤', '').trim() || '',
            row.cells[4]?.textContent?.replace('📞', '').trim() || '',
            row.cells[5]?.textContent?.replace('📱', '').trim() || '—',
            row.cells[6]?.textContent?.replace('✉️', '').trim() || '—',
            row.cells[7]?.textContent?.split('→')[0]?.replace('📅', '').trim() || '',
            row.cells[7]?.textContent?.split('→')[1]?.trim() || '',
            row.cells[8]?.textContent?.replace('👥', '').trim() || '',
            row.cells[9]?.textContent?.replace('₾', '').trim() || '',
            row.cells[10]?.textContent?.trim() || '',
            row.cells[0]?.querySelector('.booking-date-small')?.textContent || ''
        ]);
    });

    const htmlRows = data.map(row => '<tr>' + row.map(cell => `<td>${String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td>`).join('') + '</tr>').join('');
    const excelHtml = `<html><head><meta charset="UTF-8"></head><body><table>${htmlRows}</table></body></html>`;
    const blob = new Blob(['\uFEFF' + excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `meskhi_bookings_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
    showNotification('Экспорт завершён', 'success');
}


function downloadReceipt(bookingId) {
    window.open(`/api/admin/receipt/${bookingId}.pdf?username=${encodeURIComponent(adminUsername)}&password=${encodeURIComponent(adminPassword)}`, '_blank');
}

let draggedBookingId = null;
function startBookingDrag(event, bookingId) {
    draggedBookingId = bookingId;
    event.dataTransfer.setData('text/plain', bookingId);
    event.dataTransfer.effectAllowed = 'move';
}

function allowCalendarDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drop-target');
}

async function dropBookingToDate(event, newDate) {
    event.preventDefault();
    document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    const bookingId = event.dataTransfer.getData('text/plain') || draggedBookingId;
    if (!bookingId || String(bookingId).startsWith('closed-')) return;
    if (!confirm(`Перенести бронь #${bookingId} на ${formatLocalDate(newDate)}?`)) return;
    try {
        const response = await fetch('/api/admin/move-booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: adminUsername, password: adminPassword, bookingId, newCheckIn: newDate })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Ошибка переноса');
        showNotification('Бронирование перенесено', 'success');
        await loadBookings();
        await loadStats();
        await loadAdminCalendar();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function logout() {
    if (confirm('Выйти из админ-панели?')) {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('adminSection').style.display = 'none';
        document.getElementById('adminPassword').value = '';
        adminPassword = '';
        currentFilter = 'all';
        showNotification('Выход выполнен', 'info');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `<div class="notification-content"><i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}"></i><span>${message}</span></div>`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}