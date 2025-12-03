/* Лабораторная работа №7: LocalStorage, События, MVC Контроллер */

(function() { // IIFE начало

    /* --- MODEL --- */
    class QueueCollection {
        constructor() {
            this._bookings = [];
            this.STORAGE_KEY = 'bank_queue_data';
            this.restore(); 
        }

        save() {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._bookings));
        }

        restore() {
            const rawData = localStorage.getItem(this.STORAGE_KEY);
            if (rawData) {
                this._bookings = JSON.parse(rawData);
            } else {
                this._generateMockData();
                this.save();
            }
        }

        _generateMockData() {
            const services = ["Работа со счетом", "Взять кредит", "Открыть счёт", "Оплата"];
            for (let i = 1; i <= 20; i++) {
                this._bookings.push({
                    id: String(Date.now() + i),
                    description: services[Math.floor(Math.random() * services.length)],
                    createdAt: new Date().toISOString(),
                    author: i % 2 === 0 ? "Иванов Иван" : "Петрова Анна",
                    contact: `+790012345${i < 10 ? '0' + i : i}`,
                    visitDate: "2025-11-20",
                    visitTime: `${10 + Math.floor(i/2)}:${i % 2 === 0 ? '00' : '30'}`
                });
            }
        }

        getObjs(skip = 0, top = 10, filterConfig = {}, sortOption = 'time') {
            let result = [...this._bookings];

            if (filterConfig.search) {
                const term = filterConfig.search.toLowerCase();
                result = result.filter(item => 
                    item.author.toLowerCase().includes(term) ||
                    item.contact.includes(term)
                );
            }

            result.sort((a, b) => {
                if (sortOption === 'author') return a.author.localeCompare(b.author);
                const dateA = new Date(`${a.visitDate}T${a.visitTime}`);
                const dateB = new Date(`${b.visitDate}T${b.visitTime}`);
                return dateA - dateB;
            });

            return result.slice(skip, skip + top);
        }

        count(filterConfig = {}) {
            let result = [...this._bookings];
            if (filterConfig.search) {
                result = result.filter(item => item.author.toLowerCase().includes(filterConfig.search.toLowerCase()));
            }
            return result.length;
        }

        addObj(obj) {
            const newObj = {
                id: String(Date.now()),
                createdAt: new Date().toISOString(),
                ...obj
            };
            this._bookings.push(newObj);
            this.save();
            return true;
        }

        editObj(id, newFields) {
            const index = this._bookings.findIndex(item => item.id === id);
            if (index !== -1) {
                this._bookings[index] = { ...this._bookings[index], ...newFields };
                this.save();
                return true;
            }
            return false;
        }

        removeObj(id) {
            const initialLen = this._bookings.length;
            this._bookings = this._bookings.filter(item => item.id !== id);
            if (this._bookings.length !== initialLen) {
                this.save();
                return true;
            }
            return false;
        }
    }

    /* --- VIEW --- */
    class QueueView {
        constructor() {
            this.container = document.getElementById('booking-list');
            this.userDisplay = document.getElementById('username-display');
            this.logoutBtn = document.getElementById('logout-btn');
            this.navLoginLink = document.getElementById('nav-login-link');
            this.loadMoreBtn = document.getElementById('load-more-btn');
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
                item.dataset.id = booking.id; // Для делегирования
                
                let html = `
                    <div class="item-info">
                        <strong>${booking.author}</strong>
                        <span>${booking.description}</span>
                        <span>${booking.visitDate} в ${booking.visitTime}</span>
                        <small style="color:#666">${booking.contact}</small>
                    </div>
                `;

                if (currentUser) {
                    html += `
                    <div class="item-actions">
                        <button class="btn btn-secondary action-btn edit-btn">Ред.</button>
                        <button class="btn btn-danger action-btn delete-btn">Удал.</button>
                    </div>`;
                }

                item.innerHTML = html;
                this.container.appendChild(item);
            });
        }

        updateUserState(user) {
            if (user) {
                this.userDisplay.textContent = user;
                this.logoutBtn.style.display = 'inline-block';
                this.navLoginLink.style.display = 'none';
            } else {
                this.userDisplay.textContent = '';
                this.logoutBtn.style.display = 'none';
                this.navLoginLink.style.display = 'inline-block';
            }
        }

        toggleLoadMore(show) {
            this.loadMoreBtn.style.display = show ? 'inline-block' : 'none';
        }
    }

    /* --- CONTROLLER --- */
    class AppController {
        constructor(model, view) {
            this.model = model;
            this.view = view;
            this.currentUser = null; 
            this.currentCount = 10;
            this.filterConfig = { search: '' };
            this.sortOption = 'time';
            this.init();
        }

        init() {
            this.bindEvents();
            // Восстановление сессии пользователя
            const savedUser = localStorage.getItem('bank_current_user');
            if (savedUser) this.login(savedUser);
            else this.render();
        }

        bindEvents() {
            // Вход
            document.getElementById('login-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('login-username').value;
                if (username) {
                    this.login(username);
                    e.target.reset();
                    window.location.hash = '#employee-dashboard';
                }
            });

            // Выход
            document.getElementById('logout-btn').addEventListener('click', () => {
                this.logout();
                window.location.hash = '#home';
            });

            // Добавление записи
            document.getElementById('booking-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const newBooking = {
                    author: document.getElementById('fullName').value,
                    contact: document.getElementById('contact').value,
                    description: document.getElementById('service').value,
                    visitDate: document.getElementById('visitDate').value,
                    visitTime: document.getElementById('visitTime').value
                };
                this.model.addObj(newBooking);
                alert('Запись создана!');
                e.target.reset();
                this.render();
            });

            // Поиск и сортировка
            document.getElementById('search-input').addEventListener('input', (e) => {
                this.filterConfig.search = e.target.value;
                this.currentCount = 10;
                this.render();
            });
            document.getElementById('sort-select').addEventListener('change', (e) => {
                this.sortOption = e.target.value;
                this.render();
            });

            // Загрузить еще
            document.getElementById('load-more-btn').addEventListener('click', () => {
                this.currentCount += 10;
                this.render();
            });

            // Делегирование (Удаление и Редактирование)
            document.getElementById('booking-list').addEventListener('click', (e) => {
                const btn = e.target.closest('.action-btn');
                if (!btn) return;

                const id = btn.closest('.list-item').dataset.id;

                if (btn.classList.contains('delete-btn')) {
                    if (confirm('Удалить запись?')) {
                        this.model.removeObj(id);
                        this.render();
                    }
                } else if (btn.classList.contains('edit-btn')) {
                    const newTime = prompt("Новое время визита (HH:MM):");
                    if (newTime) {
                        this.model.editObj(id, { visitTime: newTime });
                        this.render();
                    }
                }
            });
        }

        login(username) {
            this.currentUser = username;
            localStorage.setItem('bank_current_user', username);
            this.view.updateUserState(this.currentUser);
            this.render();
        }

        logout() {
            this.currentUser = null;
            localStorage.removeItem('bank_current_user');
            this.view.updateUserState(null);
            this.render();
        }

        render() {
            const data = this.model.getObjs(0, this.currentCount, this.filterConfig, this.sortOption);
            const total = this.model.count(this.filterConfig);
            this.view.displayList(data, this.currentUser);
            this.view.toggleLoadMore(this.currentCount < total);
        }
    }

    // Старт
    new AppController(new QueueCollection(), new QueueView());

})(); // Конец IIFE