define('custom:views/apartment/board', ['views/main'], function (View) {
    const node = (tag, text, className) => {
        const element = document.createElement(tag);
        if (text !== undefined) element.textContent = text;
        if (className) element.className = className;
        return element;
    };
    return View.extend({
        name: 'List',
        rootUrl: '#Apartment',
        storeViewAfterUpdate: false,
        templateContent: '<div class="apartment-board"><h2>Шахматка квартир</h2><div class="board-actions"><a class="btn btn-primary" href="#Apartment/create">Добавить квартиру</a> <button class="btn btn-default" data-action="refresh">Обновить</button></div><p class="board-summary" role="status"></p><div class="board-filters"></div><div class="board-content"></div></div>',
        afterRender: function () {
            document.title = 'Шахматка квартир — EspoCRM';
            this.el.querySelector('[data-action="refresh"]').addEventListener('click', () => this.loadApartments());
            this.el.querySelector('.board-filters').addEventListener('change', () => this.draw());
            this.loadApartments();
        },
        loadApartments: async function () {
            if (this.loading) return;
            this.loading = true;
            const summary = this.el.querySelector('.board-summary');
            summary.textContent = 'Загрузка квартир…';
            try {
                const rows = [];
                let offset = 0;
                while (true) {
                    const result = await Espo.Ajax.getRequest('Apartment', {maxSize: 200, offset, orderBy: 'id', order: 'asc'});
                    rows.push(...result.list);
                    offset += result.list.length;
                    if (result.list.length < 200 || (result.total >= 0 && offset >= result.total)) break;
                }
                if (!summary.isConnected) return;
                this.rows = rows;
                this.makeFilters();
                this.draw();
            } catch (error) {
                summary.textContent = 'Не удалось загрузить квартиры. Проверьте соединение и права доступа, затем нажмите «Обновить».';
                console.error('Apartment board:', error);
            } finally { this.loading = false; }
        },
        makeFilters: function () {
            const host = this.el.querySelector('.board-filters');
            const previous = {};
            host.querySelectorAll('select').forEach(select => { previous[select.dataset.field] = select.value; });
            host.replaceChildren();
            [['building', 'Дом'], ['entrance', 'Секция'], ['rooms', 'Комнат'], ['status', 'Статус']].forEach(([field, label]) => {
                const select = node('select', undefined, 'form-control');
                select.dataset.field = field;
                select.setAttribute('aria-label', label);
                const all = node('option', 'Все');
                all.value = '';
                select.append(all);
                const values = [...new Set(this.rows.map(row => row[field]).filter(value => value !== null && value !== undefined))];
                values.sort((a, b) => String(a).localeCompare(String(b), 'ru', {numeric: true}));
                values.forEach(value => {
                    const option = node('option', field === 'status' ? this.statusLabel(value) : value);
                    option.value = value;
                    select.append(option);
                });
                if ([...select.options].some(option => option.value === previous[field])) select.value = previous[field];
                const wrapper = node('label', label + ' ');
                wrapper.append(select);
                host.append(wrapper);
            });
        },
        statusLabel: function (status) { return {Available: 'Свободна', Reserved: 'Бронь', Sold: 'Продана'}[status] || status || 'Без статуса'; },
        draw: function () {
            const filters = {};
            this.el.querySelectorAll('.board-filters select').forEach(select => { filters[select.dataset.field] = select.value; });
            const rows = this.rows.filter(row => Object.entries(filters).every(([field, value]) => value === '' || String(row[field]) === value));
            const count = status => rows.filter(row => row.status === status).length;
            this.el.querySelector('.board-summary').textContent = `Квартир: ${rows.length} · Свободно: ${count('Available')} · Бронь: ${count('Reserved')} · Продано: ${count('Sold')}`;
            const content = this.el.querySelector('.board-content');
            content.replaceChildren();
            if (!rows.length) content.append(node('p', 'Квартир нет. Добавьте квартиру или измените фильтры.'));
            const groups = new Map();
            rows.forEach(row => {
                const key = JSON.stringify([row.building, row.entrance]);
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(row);
            });
            groups.forEach(group => {
                content.append(node('h3', `${group[0].building || 'Дом не указан'} · секция ${group[0].entrance || '—'}`));
                const floors = [...new Set(group.map(row => row.floor))].sort((a,b) => b - a);
                floors.forEach(floor => {
                    const line = node('div', undefined, 'apartment-floor');
                    line.append(node('strong', `${floor} этаж`, 'floor-label'));
                    const cells = node('div', undefined, 'apartment-cells');
                    group.filter(row => row.floor === floor).sort((a,b) => String(a.number).localeCompare(String(b.number), 'ru', {numeric:true})).forEach(row => {
                        const state = ['Available','Reserved','Sold'].includes(row.status) ? row.status : 'Unknown';
                        const card = node('a', undefined, 'apartment-card state-' + state);
                        card.href = '#Apartment/view/' + encodeURIComponent(row.id);
                        card.append(node('strong', '№ ' + row.number));
                        card.append(node('span', `${row.rooms ?? '—'} комн. · ${row.area ?? '—'} м²`));
                        card.append(node('span', row.price == null ? 'Цена не указана' : Number(row.price).toLocaleString('ru-RU') + ' ₽'));
                        card.append(node('small', this.statusLabel(row.status)));
                        cells.append(card);
                    });
                    line.append(cells);
                    content.append(line);
                });
            });
            this.el.querySelectorAll('style.board-style').forEach(style => style.remove());
            this.el.append(node('style', '.board-actions{margin-bottom:16px}.board-filters{display:flex;gap:16px;flex-wrap:wrap;margin:20px 0}.board-filters label{min-width:140px}.apartment-floor{display:flex;align-items:center;gap:14px;margin:10px 0}.floor-label{width:65px;flex-shrink:0}.apartment-cells{display:flex;flex-wrap:wrap;gap:8px}.apartment-card{display:flex;flex-direction:column;gap:5px;min-width:145px;padding:12px;border:1px solid #bbb;border-left:5px solid #888;border-radius:7px;color:#172b3a;background:#f3f4f6}.apartment-card:hover{box-shadow:0 2px 8px #999;color:#172b3a}.state-Available{background:#e6f5ec;border-left-color:#23804b}.state-Reserved{background:#fff3d1;border-left-color:#b77700}.state-Sold{background:#fbe4e4;border-left-color:#bc3434}@media(max-width:600px){.apartment-card{min-width:125px}.floor-label{width:45px}}', 'board-style'));
        }
    });
});
