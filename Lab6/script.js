/* 
   ================================================================
   ЧАСТЬ 1: МОДЕЛЬ (Lab 6.a)
   Класс QueueCollection для управления данными
   ================================================================
*/

class QueueCollection {
    constructor(initialData = []) {
        this._bookings = initialData;
    }

    _validateObj(obj) {
        if (!obj) return false;
        const requiredFields = ['description', 'author', 'visitDate', 'visitTime'];
        
        for (let field of requiredFields) {
            if (!obj[field] || typeof obj[field] !== 'string') {
                console.warn(`Validation failed: Missing or invalid ${field}`);
                return false;
            }
        }
        return true;
    }

    getObjs(skip = 0, top = 10, filterConfig = {}) {
        let result = [...this._bookings];

        // 1. Фильтрация
        if (filterConfig.author) {
            result = result.filter(item => 
                item.author.toLowerCase().includes(filterConfig.author.toLowerCase())
            );
        }
        if (filterConfig.service) {
            result = result.filter(item => item.description === filterConfig.service);
        }

        // 2. Сортировка (по дате и времени)
        result.sort((a, b) => {
            const dateA = new Date(`${a.visitDate}T${a.visitTime}`);
            const dateB = new Date(`${b.visitDate}T${b.visitTime}`);
            return dateA - dateB;
        });

        // 3. Пагинация
        return result.slice(skip, skip + top);
    }

    // Метод для проверки общего количества (чтобы скрыть кнопку Load More)
    count(filterConfig = {}) {
        let result = [...this._bookings];
        if (filterConfig.author) {
            result = result.filter(item => 
                item.author.toLowerCase().includes(filterConfig.author.toLowerCase())
            );
        }
        return result.length;
    }

    getObj(id) {
        return this._bookings.find(item => item.id === id);
    }

    addObj(obj) {
        if (this._validateObj(obj)) {
            const newObj = {
                id: String(Date.now()),
                createdAt: new Date(),
                photoLink: 'placeholder.jpg',
                ...obj
            };
            this._bookings.push(newObj);
            return true;
        }
        return false;
    }

    editObj(id, newFields) {
        const index = this._bookings.findIndex(item => item.id === id);
        if (index === -1) return false;

        const currentObj = this._bookings[index];
        const updatedObj = { ...currentObj, ...newFields };

        updatedObj.id = currentObj.id;
        updatedObj.author = currentObj.author;
        updatedObj.createdAt = currentObj.createdAt;

        if (this._validateObj(updatedObj)) {
            this._bookings[index] = updatedObj;
            return true;
        }
        return false;
    }

    removeObj(id) {
        const initialLength = this._bookings.length;
        this._bookings = this._bookings.filter(item => item.id !== id);
        return this._bookings.length < initialLength;
    }

    addAll(objs) {
        const added = [];
        objs.forEach(obj => {
            if (this.addObj(obj)) added.push(obj);
        });
        return added;
    }

    clear() {
        this._bookings = [];
    }
}

/* 
   ================================================================
   ДАННЫЕ (25 объектов для теста пагинации)
   ================================================================
*/
const services = ["Работа со счетом", "Взять кредит", "Открыть счёт", "Оплата"];
const mockData = [];

for (let i = 1; i <= 25; i++) {
    mockData.push({
        id: String(i),
        description: services[Math.floor(Math.random() * services.length)],
        createdAt: new Date(),
        author: i % 2 === 0 ? "Иванов Иван" : "Петрова Анна",
        photoLink: "http://example.com/photo.jpg",
        contact: `+790012345${i < 10 ? '0' + i : i}`,
        visitDate: "2025-11-20",
        visitTime: `${10 + Math.floor(i/2)}:${i % 2 === 0 ? '00' : '30'}`
    });
}

/* 
   ================================================================
   ЧАСТЬ 2: VIEW (Lab 6.b)
   ================================================================
*/

class QueueView {
    constructor() {
        this.container = document.getElementById('booking-list');
        this.userDisplay = document.getElementById('user-info');
        this.loadMoreBtn = document.querySelector('.pagination .btn'); // Кнопка "Загрузить еще"
    }

    displayList(bookings, currentUser) {
        this.container.innerHTML = '';

        if (bookings.length === 0) {
            this.container.innerHTML = '<p style="text-align:center; padding:20px;">Нет записей</p>';
            return;
        }

        bookings.forEach(booking => {
            const item = document.createElement('article');
            item.className = 'list-item';
            item.id = `booking-${booking.id}`;
            
            let html = `
                <div class="item-info">
                    <strong>${booking.author}</strong>
                    <span>Услуга: ${booking.description}</span>
                    <span>Время: ${booking.visitDate} ${booking.visitTime}</span>
                    <small style="color:#666">ID: ${booking.id}</small>
                </div>
            `;

            if (currentUser) {
                html += `
                <div class="item-actions">
                    <button class="btn btn-secondary" onclick="consoleEdit('${booking.id}')">Изм.</button>
                    <button class="btn btn-danger" onclick="consoleDelete('${booking.id}')">Удал.</button>
                </div>`;
            }

            item.innerHTML = html;
            this.container.appendChild(item);
        });
    }

    updateHeader(user) {
        this.userDisplay.textContent = user ? `Пользователь: ${user}` : 'Гость';
    }

    // Скрыть кнопку, если больше нечего грузить
    toggleLoadMoreBtn(isVisible) {
        if (this.loadMoreBtn) {
            this.loadMoreBtn.style.display = isVisible ? 'inline-block' : 'none';
        }
    }
}

/* 
   ================================================================
   ЧАСТЬ 3: CONTROLLER
   ================================================================
*/

const model = new QueueCollection(mockData);
const view = new QueueView();

let currentUser = 'Менеджер'; 
let currentCount = 10; // Начинаем с 10 записей

function render() {
    const searchText = document.getElementById('search-input').value;
    const filter = searchText ? { author: searchText } : {};
    
    // Получаем срез данных (от 0 до currentCount)
    const data = model.getObjs(0, currentCount, filter);
    
    // Получаем общее кол-во подходящих записей (чтобы понять, нужна ли кнопка)
    const totalFiltered = model.count(filter);

    view.updateHeader(currentUser);
    view.displayList(data, currentUser);
    
    // Если показали всё, скрываем кнопку
    view.toggleLoadMoreBtn(currentCount < totalFiltered);
}

// --- Глобальные функции ---

// 1. Загрузить еще (ИСПРАВЛЕНО)
window.loadMore = function() {
    currentCount += 10; // Увеличиваем лимит на 10
    console.log(`Загрузка данных... Показываем ${currentCount} записей.`);
    render();
}

window.changeUser = function(user) {
    currentUser = user;
    render();
}

window.addBooking = function(obj) {
    const success = model.addObj(obj);
    if (success) {
        console.log('Запись добавлена');
        render();
    } else {
        console.error('Ошибка валидации');
    }
}

window.consoleAddFromForm = function() {
    const newBooking = {
        author: document.getElementById('fullName').value,
        contact: document.getElementById('contact').value,
        description: document.getElementById('service').value,
        visitDate: document.getElementById('visitDate').value,
        visitTime: document.getElementById('visitTime').value
    };
    
    if(!newBooking.author || !newBooking.visitDate || !newBooking.visitTime) {
        alert("Заполните обязательные поля!");
        return;
    }

    window.addBooking(newBooking);
    alert("Запись добавлена!");
    document.querySelector('form').reset();
}

window.editBooking = function(id, newFields) {
    const success = model.editObj(id, newFields);
    if (success) {
        render();
    } else {
        console.error('Ошибка редактирования');
    }
}

window.consoleEdit = function(id) {
    const newTime = prompt("Введите новое время (HH:MM):", "12:00");
    if(newTime) {
        window.editBooking(id, { visitTime: newTime });
    }
}

window.removeBooking = function(id) {
    const success = model.removeObj(id);
    if (success) {
        render();
    } else {
        console.error('Ошибка удаления');
    }
}

window.consoleDelete = function(id) {
    if(confirm("Удалить запись?")) {
        window.removeBooking(id);
    }
}

window.handleSearch = function(val) {
    // При поиске сбрасываем пагинацию на начало
    currentCount = 10; 
    render();
}

window.applyFilter = function(type) {
    // Пример сортировки для кнопки (хотя сортировка встроена в getObjs по дате)
    alert("Сортировка по дате уже применена автоматически!");
}

// Первый запуск
render();