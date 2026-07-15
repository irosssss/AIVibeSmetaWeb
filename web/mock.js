/* ============================================================
   Design Ledger — единый mock-слой данных (LedgerAPI)
   ------------------------------------------------------------
   Все экраны ходят ТОЛЬКО сюда. Сигнатуры методов совпадают с
   будущим реальным API (Yandex Cloud Functions + YDB), поэтому
   при подключении бэкенда UI переписывать не придётся — достаточно
   заменить тела методов на fetch(...).

   Точки замены помечены  // → API:  с предполагаемым эндпоинтом.
   ============================================================ */
(function () {
  const LATENCY = 420; // имитация сети
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const clone = (x) => JSON.parse(JSON.stringify(x));

  /* ----------------------------- DB (in-memory) ----------------------------- */
  const db = {
    session: null, // { user } | null

    users: [
      { id: "u_1", name: "Ирина Соколова", email: "irina@designledger.ru", role: "admin", provider: "yandex", status: "active", joined: "2026-01-12", projects: 14, avatar: "#B7502C" },
      { id: "u_2", name: "Максим Орлов", email: "max.orlov@vk.com", role: "user", provider: "vk", status: "active", joined: "2026-02-03", projects: 6, avatar: "#6B9BE8" },
      { id: "u_3", name: "Алина Гусева", email: "alina.g@yandex.ru", role: "user", provider: "yandex", status: "active", joined: "2026-02-21", projects: 9, avatar: "#1F8A6B" },
      { id: "u_4", name: "Дмитрий Лебедев", email: "d.lebedev@vk.com", role: "user", provider: "vk", status: "blocked", joined: "2026-03-01", projects: 2, avatar: "#A6B24E" },
      { id: "u_5", name: "Полина Зайцева", email: "polina.z@yandex.ru", role: "user", provider: "yandex", status: "active", joined: "2026-03-18", projects: 11, avatar: "#F0764F" },
      { id: "u_6", name: "Артём Волков", email: "artem.v@vk.com", role: "user", provider: "vk", status: "active", joined: "2026-04-02", projects: 4, avatar: "#8a6fb0" },
      { id: "u_7", name: "Ева Морозова", email: "eva.m@yandex.ru", role: "user", provider: "yandex", status: "active", joined: "2026-04-27", projects: 7, avatar: "#6B9BE8" },
    ],

    /* Журнал комплектатора — продуктовый SEO-контент под боли дизайнера
       (не тренды для клиента: путь B, решение владельца 14.07). body — реальный
       текст статьи: \n\n = абзац, строка «## …» = подзаголовок H2 (ArticlePage
       так и рендерит). views — 0 у всех: реального счётчика нет, честно не выдумываем. */
    news: [
      { id: "n_1", title: "Наценка дизайнера: как посчитать и не потерять на комплектации", category: "Наценка", cover: "warm", author: "Редакция Design Ledger", date: "2026-05-28", status: "published", views: 0,
        excerpt: "Процент на всё или ставка по разделам? Разбираем, как считать наценку прозрачно для себя и спокойно для клиента.",
        body: "Наценка — это не жадность, а оплата вашей работы по подбору, закупке и контролю поставок. Проблема в другом: «единый процент на всё» почти всегда либо недооценивает сложные разделы, либо отпугивает клиента одной большой цифрой.\n\n## Процент на всё против ставки по разделам\n\nЕдиный процент прост, но нечестен к вам. Кухня под заказ, мягкая мебель и подбор света требуют разного времени, а наценка выходит одна. Ставка по разделам ближе к реальности: там, где вы тратите больше времени на согласования и замеры, — процент выше; на расходники и декор — ниже.\n\n## Что на самом деле оплачивает наценка\n\nПодбор позиций под бюджет и стиль, проверку габаритов и совместимости, закупку и контроль сроков, замену брака. Клиенту проще принять наценку, когда он видит за ней работу, а не абстрактный процент.\n\n## Как показать это клиенту\n\nНе показывайте закупочную цену — показывайте свою. Клиенту важна итоговая сумма и уверенность, что вы её держите. Ваша себестоимость и маржа остаются вашей внутренней кухней.\n\nВ Design Ledger наценка считается по разделам и живёт в одном документе с себестоимостью: вы видите маржу, клиент — только свою цену. Соберите первую смету бесплатно и посмотрите, как это выглядит с обеих сторон." },
      { id: "n_2", title: "Смета клиенту без вечера в Excel: 5 шагов", category: "Смета", cover: "market", author: "Максим Орлов", date: "2026-05-21", status: "published", views: 0,
        excerpt: "Как собрать спецификацию с ценами и наценкой за минуты, а не переписывать предметы в таблицу вручную.",
        body: "Ручная смета в Excel съедает вечер после каждого замера: перенести позиции, найти цены, посчитать наценку, оформить так, чтобы клиент понял. Всё это можно свернуть в пять шагов.\n\n## 1. Собрать позиции по комнатам\n\nСпецификация читается по помещениям, а не сплошным списком. Клиенту понятнее «гостиная: диван, свет, декор», чем 40 строк подряд.\n\n## 2. Заводить цены сразу, а не потом\n\nКаждая позиция — с закупочной ценой и артикулом в момент добавления. Возврат «дозаполнить цены» — главный пожиратель времени.\n\n## 3. Наценка — по разделам\n\nОдин ползунок на всю смету или свой процент на мягкую мебель и кухни. Клиентская сумма пересчитывается на лету.\n\n## 4. Две цены в одном документе\n\nВы видите себестоимость и маржу, клиент в своей выгрузке — только свою цену. Не нужно вести две таблицы.\n\n## 5. Отправить, а не пересылать PDF\n\nСсылка на портал вместо вложения в переписке: клиент открывает смету в браузере и отвечает по позициям.\n\nВ Design Ledger эти пять шагов — один экран. Попробуйте на первой смете бесплатно." },
      { id: "n_3", title: "Спецификация FF&E: что включить, чтобы клиент не задавал вопросов", category: "Комплектация", cover: "living", author: "Ирина Соколова", date: "2026-05-14", status: "published", views: 0,
        excerpt: "Артикул, материал, габариты, срок поставки — минимальный набор полей, который снимает половину вопросов клиента и поставщика.",
        body: "FF&E-спецификация (furniture, fixtures & equipment) — это не просто список «что купить». Это документ, по которому клиент принимает решение, а поставщик собирает заказ. Пропущенное поле — это лишний созвон.\n\n## Минимальный набор полей\n\nНаименование, раздел, количество, цена. Дальше — то, что снимает вопросы: артикул (чтобы заказать именно это), материал и габариты (чтобы клиент представил вещь и она влезла), срок поставки (чтобы спланировать стройку).\n\n## Что видит клиент, а что — нет\n\nКлиенту показывают материал, габариты, фото и его цену. Артикул и срок поставки — рабочая информация: в клиентской версии их обычно скрывают, чтобы смету нельзя было «обойти» напрямую.\n\n## Фото решают\n\nОдна миниатюра рядом со строкой экономит абзац описания. Клиент утверждает быстрее, когда видит вещь, а не читает про неё.\n\nВ Design Ledger все эти поля живут в одной карточке позиции и по-разному раскрываются в рабочей, клиентской и закупочной выгрузке. Соберите спецификацию и выгрузите её в трёх видах бесплатно." },
      { id: "n_4", title: "Ссылка на товар — сразу строка сметы: как работает клиппер", category: "Технологии", cover: "ar", author: "Ирина Соколова", date: "2026-05-06", status: "published", views: 0,
        excerpt: "Клиппер читает карточку товара на сайте фабрики — название, артикул, цену и габариты — и кладёт готовую позицию в спецификацию.",
        body: "Самая скучная часть комплектации — переписывать данные с сайтов фабрик в таблицу. Клиппер убирает этот шаг: вставляете ссылку на карточку товара — получаете готовую строку сметы.\n\n## Что он достаёт\n\nНазвание, цену, бренд, артикул и габариты — из структурированных данных страницы (разметка товара, которую сайты отдают поисковикам). Первым срабатывает самый надёжный источник, поэтому цена и название берутся точными, а не угаданными.\n\n## Почему это надёжнее ручного ввода\n\nЧеловек ошибается в цифрах и путает артикулы. Клиппер берёт ровно то, что на странице, и подставляет в наш формат — рубли, сантиметры, наш словарь поставщиков.\n\n## Что делать, если сайт закрыт\n\nНекоторые магазины не отдают страницу напрямую. Тогда клиппер честно предлагает вставить HTML страницы вручную — и разбирает его тем же движком.\n\nКаждая извлечённая позиция проверяется вами перед добавлением — автоматика ускоряет, но решение за дизайнером. Попробуйте вставить первую ссылку бесплатно." },
      { id: "n_5", title: "Портал согласования вместо PDF в переписке: почему клиент решает быстрее", category: "Портал", cover: "office", author: "Полина Зайцева", date: "2026-04-29", status: "published", views: 0,
        excerpt: "PDF в мессенджере теряется и устаревает. Ссылка на портал держит смету актуальной и собирает решения клиента по позициям.",
        body: "Смета, отправленная PDF-файлом в переписку, живёт плохо: клиент открывает старую версию, отвечает голосовыми «этот диван не берём», а вы вручную сводите правки. Портал согласования меняет саму механику.\n\n## Одна ссылка вместо вложений\n\nКлиент открывает смету в браузере без пароля и всегда видит актуальную версию. Никаких «пришлите последний файл».\n\n## Решение по каждой позиции\n\nПо каждой строке клиент отмечает: согласовано, обсуждается, на пересмотр. Вы видите статус, а не расшифровываете переписку.\n\n## Протокол вместо скриншотов\n\nВсе решения клиента с датами собираются в один протокол — это защищает вас, если позже возникнет «мы такого не утверждали».\n\n## Клиент видит только свою цену\n\nСебестоимость и наценка на портал не попадают. Клиент решает по своей цене, ваша кухня остаётся закрытой.\n\nВ Design Ledger портал выпускается из версии сметы одной кнопкой, с вашим лого и реквизитами в шапке. Соберите смету и выпустите ссылку бесплатно." },
      { id: "n_6", title: "Розница и выгода клиента: как показать ценность вашей работы", category: "Наценка", cover: "deco", author: "Ева Морозова", date: "2026-04-20", status: "published", views: 0,
        excerpt: "Когда клиент видит, что ваша цена ниже магазинной розницы, наценка перестаёт быть предметом спора.",
        body: "Клиент часто думает, что дизайнер «накручивает». Самый спокойный способ снять это возражение — показать розницу магазина рядом с вашей ценой и разницу в пользу клиента.\n\n## Почему у вас дешевле розницы\n\nВы закупаете со скидкой салона или напрямую у фабрики. Даже с вашей наценкой итог часто ниже, чем если бы клиент купил сам в рознице. Это и есть ощутимая выгода вашей работы.\n\n## Как это показать, не раскрывая себестоимость\n\nПоказывают три числа: розница в магазине, цена клиенту, выгода клиента. Ваша закупочная цена и процент наценки при этом не видны — клиент видит, что экономит, а не как считается ваша маржа.\n\n## Когда розницы нет\n\nНе у каждой позиции есть публичная розница. Не выдумывайте её — показывайте выгоду только там, где она реальна. Честная частичная выгода убедительнее общей красивой цифры.\n\nВ Design Ledger розница и выгода клиента считаются по строкам и попадают в клиентскую выгрузку и портал. Соберите смету и покажите клиенту его выгоду бесплатно." },
    ],

    // сохранённые проекты текущего пользователя
    // status = стадия петли комплектатора: Сбор → Согласование → Закупка → Сдача (+ Архив)
    projects: [
      { id: "p_1", name: "Гостиная на Патриках", room: "Гостиная", style: "Neo Deco", area: 38, items: 12, budget: 480000, updated: "2026-05-27", cover: "living", status: "Сбор" },
      { id: "p_2", name: "Спальня — тёплый минимализм", room: "Спальня", style: "Тёплый минимализм", area: 18, items: 8, budget: 210000, updated: "2026-05-19", cover: "bedroom", status: "Сдача" },
      { id: "p_3", name: "Кухня-столовая", room: "Кухня", style: "Сканди", area: 22, items: 12, budget: 365000, updated: "2026-05-11", cover: "kitchen", status: "Согласование" },
      { id: "p_4", name: "Домашний кабинет", room: "Кабинет", style: "Индустриальный", area: 12, items: 6, budget: 145000, updated: "2026-04-30", cover: "office", status: "Архив" },
      { id: "p_kirova", name: "Кирова 17к1", room: "3 комнаты · 87,59 м²", style: "По дизайн-проекту", area: 87.59, items: 50, budget: 2700000, updated: "2025-01-30", cover: "living", status: "Закупка" },
    ],

    // избранные товары (мудборд + шоп-лист) — фото SELF-HOST в web/public/img
    // (ph-fav-*.jpg, источник Unsplash, скачаны 14.07): хотлинк был хрупким —
    // id ковра (f_3) на их CDN уже умер (404), тумбнейл в демо был битым
    favorites: [
      { id: "f_1", title: "Модульный диван, букле", mp: "f2", price: 164900, old: 219000, room: "Гостиная", tag: "Neo Deco", img: "img/ph-fav-1.jpg" },
      { id: "f_2", title: "Люстра латунь + бра", mp: "f2", price: 57000, old: 79000, room: "Гостиная", tag: "Neo Deco", img: "img/ph-fav-2.jpg" },
      { id: "f_3", title: "Ковёр шерсть, геометрия", mp: "f1", price: 41900, old: 58000, room: "Гостиная", tag: "Neo Deco", img: "img/ph-fav-3.jpg" },
      { id: "f_4", title: "Кровать с мягким изголовьем", mp: "f2", price: 58900, old: 79000, room: "Спальня", tag: "Тёплый минимализм", img: "img/ph-fav-4.jpg" },
      { id: "f_5", title: "Лён: шторы, плед, подушки", mp: "f2", price: 32900, old: 45000, room: "Спальня", tag: "Тёплый минимализм", img: "img/ph-fav-5.jpg" },
      { id: "f_6", title: "Стол дуб шпон, 160 см", mp: "f2", price: 44900, old: 61000, room: "Кухня", tag: "Сканди", img: "img/ph-fav-6.jpg" },
      { id: "f_7", title: "Кресло, эргономика", mp: "f1", price: 32900, old: 45000, room: "Кабинет", tag: "Индустриальный", img: "img/ph-fav-7.jpg" },
      { id: "f_8", title: "Стол мрамор + металл", mp: "f1", price: 37900, old: 52000, room: "Гостиная", tag: "Neo Deco", img: "img/ph-fav-8.jpg" },
      { id: "f_9", title: "Стеллаж лофт, металл + дерево", mp: "f2", price: 27900, old: 38000, room: "Кабинет", tag: "Индустриальный", img: "img/ph-fav-9.jpg" },
    ],
  };

  /* ----------------------------- localStorage-адаптер -----------------------------
     Персистентность за теми же сигнатурами LedgerAPI: при подключении бэкенда
     тела методов меняются на fetch(...), UI не трогаем. */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem("aivibe_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("aivibe_" + k, JSON.stringify(v)); } catch (e) {} },
  };
  const today = () => new Date().toISOString().slice(0, 10);

  /* ЕДИНЫЙ РЕЕСТР СТИЛЕЙ (раньше — три рассинхронизированных хардкода:
     QUIZ_STYLES, DETAILS[*].styles, STYLE_MATERIALS). owner:null = системный (read-only). */
  const SEED_STYLES = [
    { id: "deco",    name: "Neo Deco",              owner: null, mood: "Геометрия, латунь, винные тона", desc: "Веерные мотивы, рифлёные поверхности и латунь. Богато, но не громоздко.", palette: ["#7C2D3A", "#C99A4B", "#1F2933", "#E7D7C9"], materials: ["велюр", "латунь", "мрамор", "рифление", "винный бархат"], decorLevel: "rich", factor: 1.0 },
    { id: "warm",    name: "Тёплый минимализм",     owner: null, mood: "Терракота, лён, дерево",         desc: "Спокойная природная палитра, мягкие формы, минимум декора.",              palette: ["#C57B57", "#E7D3C0", "#8A8175", "#2E2A28"], materials: ["лён", "тёплое дерево", "букле", "керамика", "шерсть"],       decorLevel: "mid",  factor: 0.82 },
    { id: "japandi", name: "Japandi",               owner: null, mood: "Светлое дерево, графит, зелень",  desc: "Сканди-функциональность × японский минимализм. Чистые линии.",           palette: ["#B79B82", "#3A3D3A", "#D9D2C7", "#6E7F6A"], materials: ["светлый дуб", "графит", "ротанг", "лён", "матовый металл"],   decorLevel: "min",  factor: 0.9 },
    { id: "scandi",  name: "Сканди",                owner: null, mood: "Светлый дуб, хлопок, мята",       desc: "Светло, воздушно, функционально.",                                       palette: ["#EDE8E1", "#C9C6BE", "#9FB3A6", "#3B3A36"], materials: ["светлый дуб", "хлопок", "белёный ясень", "мята", "фетр"],     decorLevel: "min",  factor: 0.92 },
    { id: "indust",  name: "Индустриальный",        owner: null, mood: "Тёмный металл, дерево, бетон",    desc: "Открытые конструкции, металл-каркас, тёплое дерево.",                     palette: ["#2B2B2E", "#7A4B2E", "#9A9A93", "#D6CFC4"], materials: ["чёрный металл", "дуб", "бетон", "кожа", "сталь"],             decorLevel: "mid",  factor: 1.0 },
    { id: "midmod",  name: "Mid-century",           owner: null, mood: "Орех, горчица, олива",            desc: "Тёплое дерево, графичные ножки, ретро-характер.",                        palette: ["#7A5A3A", "#C29B3B", "#5E6B4E", "#E5DCCB"], materials: ["орех", "горчичный велюр", "тик", "латунь", "шерсть"],         decorLevel: "mid",  factor: 1.12 },
    { id: "modern",  name: "Современная классика",  owner: null, mood: "Тёплый беж, латунь",              desc: "Молдинги, фрезеровка, латунная фурнитура.",                              palette: ["#D8C7AE", "#A88C5F", "#5A5247", "#EFE9DF"], materials: ["шпон", "латунь", "молдинг", "бархат", "мрамор"],              decorLevel: "rich", factor: 1.18 },
    /* Популярные стили из зарубежных (AD/Houzz/Dezeen-тир, Woodgrain, Kathy Kuo,
       decorilla) и РФ (geometrium, ivd, eremont, arteli-stroy, ukka-house)
       источников — палитры выверены по реальным референсам (14.07). */
    { id: "provence", name: "Прованс",              owner: null, mood: "Лаванда, состаренное дерево, лён",  desc: "Французский кантри: выгоревшие пастели, крашеное дерево, романтичный уют.", palette: ["#A99BC1", "#EFE9DC", "#8F9E77", "#C9A66B"], materials: ["состаренное крашеное дерево", "лён", "цветочный ситец", "кованый металл", "керамика ручной росписи"], decorLevel: "mid",  factor: 1.0 },
    { id: "boho",     name: "Бохо",                 owner: null, mood: "Терракота, ротанг, макраме",        desc: "Свободное смешение этнических фактур, тёплых оттенков и живой зелени.",     palette: ["#C06A4B", "#E8D8C3", "#A9542E", "#C99A3F"], materials: ["ротанг", "макраме", "джут", "терракота", "бархат"],                       decorLevel: "rich", factor: 0.85 },
    { id: "medit",    name: "Средиземноморский",    owner: null, mood: "Белёный камень, лазурь, керамика",   desc: "Солнечный юг: белёные стены, арки, натуральный камень и глазурь.",          palette: ["#F2EFE9", "#2E6E8E", "#C67B5C", "#D9C4A3"], materials: ["натуральный камень", "глазурованная керамика", "белёное дерево", "кованое железо", "фактурная штукатурка"], decorLevel: "mid",  factor: 1.05 },
    { id: "wabi",     name: "Ваби-саби",            owner: null, mood: "Глина, известь, необработ. дерево",  desc: "Красота несовершенства: матовые фактуры, ручная керамика, приглушённость.", palette: ["#E7DFD3", "#B79B84", "#8C8377", "#6E5D4E"], materials: ["необработанное дерево", "известковая штукатурка", "ручная керамика", "лён", "натуральный камень"], decorLevel: "min",  factor: 1.24 },
    { id: "coastal",  name: "Прибрежный",           owner: null, mood: "Морская синь, песок, ротанг",       desc: "Лёгкая приморская свежесть: светлые тона, приглушённая синь, натур. волокна.", palette: ["#F4F1EA", "#A7C4C2", "#DCCBB0", "#2C4A63"], materials: ["выбеленное дерево", "ротанг", "лён", "джут", "стекло"],                   decorLevel: "mid",  factor: 0.98 },
    { id: "eco",      name: "Экостиль",             owner: null, mood: "Мох, дерево, живые растения",        desc: "Природа в доме: дерево, зелень и натуральные материалы без синтетики.",     palette: ["#6E7B5B", "#B8A88A", "#8A6E4B", "#D8D2C4"], materials: ["массив дерева", "бамбук", "пробка", "живые растения", "натуральный текстиль"], decorLevel: "mid",  factor: 1.06 },
    { id: "english",  name: "Английская классика",  owner: null, mood: "Бутылочный зелёный, бордо, массив",  desc: "Сдержанная роскошь: массив, честерфилд, глубокие тона и традиции.",         palette: ["#2F4A3C", "#7B2E33", "#EAE0CC", "#A98545"], materials: ["массив тёмного дерева", "кожа честерфилд", "бархат", "обои с узором", "латунь"], decorLevel: "rich", factor: 1.28 },
    { id: "chalet",   name: "Шале",                 owner: null, mood: "Тёмное дерево, камень, шерсть",      desc: "Горное тепло: массивное дерево, натуральный камень, шерсть, основательность.", palette: ["#4E3524", "#9A9188", "#D8C3A0", "#7A3B32"], materials: ["массив дерева", "натуральный камень", "овчина и мех", "шерстяной текстиль", "кованый металл"], decorLevel: "mid",  factor: 1.24 },
    { id: "grandm",   name: "Гранд-миллениал",      owner: null, mood: "Пудровый ситец, латунь, плетёнка",   desc: "Обновлённая классика: ситцы, цветы, латунь и плетёнка «бабушкиного дома».", palette: ["#A9C3D0", "#E6C7C2", "#F1E9D8", "#8FA07C"], materials: ["ситец и шинц", "ротанг и плетёнка", "бархат", "цветочные обои", "латунь"], decorLevel: "rich", factor: 1.08 },
    { id: "hitech",   name: "Хай-тек",              owner: null, mood: "Графит, сталь, глянец, стекло",      desc: "Технологичный минимализм: глянец, металл, стекло и холодная гамма.",        palette: ["#F5F6F7", "#3A3D42", "#B9BEC4", "#17181A"], materials: ["полированный металл", "закалённое стекло", "глянцевый пластик", "хром", "бетон"], decorLevel: "min",  factor: 1.2 },
    { id: "contemp",  name: "Контемпорари",         owner: null, mood: "Грейж, графит, гладкие фактуры",     desc: "Актуальная нейтральная база с плавными формами и точечным акцентом.",       palette: ["#CFC7BA", "#4A4A4A", "#A99C88", "#B5892E"], materials: ["шпон", "микроцемент", "матовый металл", "гладкий текстиль", "стекло"],   decorLevel: "mid",  factor: 1.0 },
    { id: "nouveau",  name: "Модерн (ар-нуво)",     owner: null, mood: "Олива, бронза, витраж, изгибы",      desc: "Плавные растительные линии, витражи, бронза и природные мотивы.",           palette: ["#6E7145", "#C79A3B", "#6E3B52", "#8A6A3B"], materials: ["гнутое дерево", "витражное стекло", "бронза", "кованый металл", "цветное стекло"], decorLevel: "rich", factor: 1.3 },
  ];

  /* ТИПОВЫЕ КОМПЛЕКТАЦИИ-ШАБЛОНЫ (роадмап #10): структура позиций — главная ценность
     (дизайнеры покупают готовые FF&E-таблицы), цены — рыночный ориентир среднего
     сегмента, sup — типовая точка закупки. Всё редактируется после вставки. */
  const SPEC_TEMPLATES = [
    { id: "tpl_bath", name: "Санузел стандарт", room: "Ванная",
      note: "Ванна, тумба с раковиной, зеркальный шкаф, полотенцесушитель",
      items: [
        { title: "Ванна акриловая 170×70 + экран", qty: 1, price: 45000, cat: "Сантехника", sup: "Салон сантехники" },
        { title: "Тумба с раковиной + смеситель", qty: 1, price: 48000, cat: "Сантехника", sup: "Салон сантехники" },
        { title: "Смеситель для ванны с душевым гарнитуром", qty: 1, price: 18000, cat: "Сантехника", sup: "Салон сантехники" },
        { title: "Зеркальный шкаф с подсветкой", qty: 1, price: 22000, cat: "Мебель", sup: "Мебельный салон" },
        { title: "Полотенцесушитель электрический", qty: 1, price: 17000, cat: "Сантехника", sup: "Салон сантехники" },
        { title: "Шторка или стеклянное ограждение", qty: 1, price: 14000, cat: "Сантехника", sup: "Салон сантехники" },
        { title: "Аксессуары: держатели, крючки, дозатор", qty: 1, price: 8000, cat: "Декор" },
      ] },
    { id: "tpl_wc", name: "Туалет гостевой", room: "Туалет",
      note: "Подвесной унитаз, мини-раковина, зеркало, гигиенический душ",
      items: [
        { title: "Унитаз подвесной с инсталляцией и кнопкой", qty: 1, price: 42000, cat: "Сантехника", sup: "Салон сантехники" },
        { title: "Мини-раковина с тумбой + смеситель", qty: 1, price: 26000, cat: "Сантехника", sup: "Салон сантехники" },
        { title: "Гигиенический душ со смесителем", qty: 1, price: 12000, cat: "Сантехника", sup: "Салон сантехники" },
        { title: "Зеркало", qty: 1, price: 8000, cat: "Декор" },
      ] },
    { id: "tpl_bedroom", name: "Спальня база", room: "Спальня",
      note: "Кровать с матрасом, тумбы, шкаф, свет и текстиль",
      items: [
        { title: "Кровать 160×200 с мягким изголовьем", qty: 1, price: 70000, cat: "Мебель", sup: "Мебельный салон" },
        { title: "Матрас 160×200", qty: 1, price: 45000, cat: "Мебель", sup: "Мебельный салон" },
        { title: "Прикроватная тумба", qty: 2, price: 12000, cat: "Мебель", sup: "Мебельный салон" },
        { title: "Шкаф распашной 2-дверный", qty: 1, price: 55000, cat: "Хранение", sup: "Мебельный салон" },
        { title: "Бра прикроватное", qty: 2, price: 7000, cat: "Освещение", sup: "Салон света" },
        { title: "Люстра потолочная", qty: 1, price: 18000, cat: "Освещение", sup: "Салон света" },
        { title: "Шторы blackout + тюль", qty: 1, price: 24000, cat: "Текстиль", sup: "Текстиль-ателье" },
      ] },
    { id: "tpl_hall", name: "Прихожая база", room: "Прихожая",
      note: "Входная группа, зеркало в рост, банкетка, споты",
      items: [
        { title: "Шкаф входной группы с открытой секцией", qty: 1, price: 60000, cat: "Мебель", sup: "Столярная мастерская" },
        { title: "Зеркало в рост", qty: 1, price: 14000, cat: "Декор" },
        { title: "Банкетка", qty: 1, price: 12000, cat: "Мебель", sup: "Мебельный салон" },
        { title: "Встроенные споты", qty: 4, price: 2500, cat: "Освещение", sup: "Салон света" },
        { title: "Коврик входной", qty: 1, price: 4000, cat: "Текстиль" },
      ] },
    { id: "tpl_kitchen_tech", name: "Кухня: техника минимум", room: "Кухня",
      note: "Варочная панель, духовка, холодильник, посудомойка, вытяжка, мойка",
      items: [
        { title: "Индукционная варочная панель", qty: 1, price: 40000, cat: "Техника", sup: "Магазин техники" },
        { title: "Духовой шкаф", qty: 1, price: 45000, cat: "Техника", sup: "Магазин техники" },
        { title: "Холодильник встраиваемый", qty: 1, price: 85000, cat: "Техника", sup: "Магазин техники" },
        { title: "Посудомоечная машина 45 см", qty: 1, price: 45000, cat: "Техника", sup: "Магазин техники" },
        { title: "Вытяжка встраиваемая", qty: 1, price: 20000, cat: "Техника", sup: "Магазин техники" },
        { title: "Мойка + смеситель", qty: 1, price: 22000, cat: "Сантехника", sup: "Салон сантехники" },
      ] },
  ];

  /* гидрация из localStorage поверх дефолтов */
  // studioName — брендинг клиентского портала (волна A5); studioCity/Phone/Email/TaxId —
  // реквизиты студии (волна W4.1) — подставляются в портал, протокол и PDF-выгрузки клиенту
  db.settings = LS.get("settings", { studioName: "", studioCity: "", studioPhone: "", studioEmail: "", studioTaxId: "" });
  db.styles   = LS.get("styles", null) || clone(SEED_STYLES);   // clone: без алиаса на модульный SEED_STYLES — create/duplicate мутируют db.styles на месте
  /* миграция 14.07: новые системные пресеты (owner:null) долить в кэш localStorage
     по id, не трогая пользовательские стили и их правки существующих */
  (function mergeSeedStyles() {
    const have = new Set(db.styles.map((s) => s.id));
    const missing = SEED_STYLES.filter((s) => !have.has(s.id));
    if (missing.length) {
      const lastSys = db.styles.reduce((i, s, j) => (s.owner === null ? j : i), -1);
      db.styles.splice(lastSys + 1, 0, ...missing);
      LS.set("styles", db.styles);
    }
  })();
  db.library  = LS.get("library", []);   // библиотека товаров студии (волна B1) — пустая до первого товара
  db.supplierCatalog = LS.get("supplierCatalog", []); // каталог товаров поставщика (портал поставщиков, срез 3) — то, что публикует сам поставщик
  db.suppliers = LS.get("suppliers", []); // адресная книга поставщиков (K5a) — пустая до первой карточки
  db.markupProfiles = LS.get("markupProfiles", []);   // сохранённые профили наценки — пусто до первого «мой стандарт»
  const _lsProjects = LS.get("projects", null); if (_lsProjects) db.projects = _lsProjects;
  const _lsFav = LS.get("favorites", null);
  if (_lsFav) {
    // миграция 14.07 (self-host фото): в старом localStorage сид-избранное заморожено
    // с Unsplash-URL (id ковра f_3 у них уже 404 — тумбнейл был битым); демо-записям
    // по id подставляем локальный путь, пользовательские (f_<timestamp>) не трогаем
    const _seedImg = Object.fromEntries(db.favorites.map((f) => [f.id, f.img]));
    db.favorites = _lsFav.map((f) => (_seedImg[f.id] && /unsplash/.test(f.img || "") ? { ...f, img: _seedImg[f.id] } : f));
  }
  db.session  = LS.get("session", null);

  /* миграция статусов проектов → стадии петли (06.07): старые значения из
     localStorage переводим один раз («В работе» — консервативно в «Сбор»,
     точную стадию пользователь выставит сам; «Готов» → «Сдача»). */
  (function migrateStages() {
    const MAP = { "В работе": "Сбор", "Готов": "Сдача" };
    let touched = false;
    db.projects.forEach((p) => { if (MAP[p.status]) { p.status = MAP[p.status]; touched = true; } });
    if (touched) LS.set("projects", db.projects);
  })();

  /* ----------------------------- AUTH ----------------------------- */
  // → API: POST /api/auth/oauth/{provider}  (обмен кода на токен → сессия/JWT)
  // role — выбор при регистрации «кто вы» (дизайнер | поставщик). Заглушка честная:
  // OAuth не реальный, но роль определяет, В КАКОЙ кабинет садится пользователь
  // (дизайнерский vs поставщика) — это разные рабочие места, не один интерфейс.
  async function oauth(provider, role) {
    await delay(700);
    if (role === "supplier") {
      // демо-персона поставщика: имя компании совпадает с поставщиком из сид-смет
      // («Мебельный салон» — 23 позиции спроса), чтобы дашборд спроса был не пустой.
      // supplierName — ключ связи со сметами дизайнеров (то же правило, что supplierMatch)
      const sup = { id: "sup_1", name: "Мебельный салон", email: "sales@meb-salon.ru", role: "supplier", supplierName: "Мебельный салон", city: "Москва", applied: "2026-07-14", moderation: "pending" };
      db.session = { user: { ...sup, provider, avatar: "#7A5C3E" } };
      LS.set("session", db.session);
      return clone(db.session);
    }
    const base = provider === "yandex"
      ? { id: "u_1", name: "Ирина Соколова", email: "irina@designledger.ru", role: "admin" }
      : { id: "u_2", name: "Максим Орлов", email: "max.orlov@vk.com", role: "user" };
    db.session = { user: { ...base, provider, avatar: provider === "yandex" ? "#B7502C" : "#6B9BE8" } };
    LS.set("session", db.session);
    return clone(db.session);
  }

  /* ----------------------------- API surface ----------------------------- */
  window.LedgerAPI = {
    /* — Аутентификация (OAuth Яндекс ID / VK ID) — */
    auth: {
      loginWithYandex: (role) => oauth("yandex", role),   // → POST /api/auth/oauth/yandex
      loginWithVK: (role) => oauth("vk", role),            // → POST /api/auth/oauth/vk
      getSession: async () => { await delay(120); return clone(db.session); }, // → GET /api/auth/session
      logout: async () => { await delay(120); db.session = null; LS.set("session", null); return { ok: true }; }, // → POST /api/auth/logout
    },

    /* — Пользовательские настройки (реквизиты студии) — */
    settings: {
      get: async () => { await delay(120); return clone(db.settings); },              // → GET /api/profile/settings
      update: async (patch) => {                                                        // → PATCH /api/profile/settings
        await delay(160);
        db.settings = { ...db.settings, ...patch };
        LS.set("settings", db.settings);
        return clone(db.settings);
      },
    },

    /* — Подписка / оплата (ЮKassa) — */
    billing: {
      // → API: POST /billing/create  (бэкенд web-billing → ЮKassa)
      // Честный плейсхолдер: пока магазин ЮKassa не подключён, успех не имитируем.
      createPayment: async ({ plan } = {}) => {
        await delay(300);
        return { ok: false, reason: "not-configured", plan: plan || "pro_month",
          message: "Оплата подключится после регистрации магазина ЮKassa (см. docs/AUTH_PAYMENT_INTEGRATION.md)." };
      },
    },

    /* — Профиль + сохранённые проекты — */
    profile: {
      get: async () => { await delay(LATENCY); return clone(db.session && db.session.user); }, // → GET /api/profile

      // → GET /api/profile/analytics  (персональная аналитика по проектам пользователя)
      // Всё считается из реальных данных localStorage: проекты, стили.
      // Дельт и «активности по неделям» нет — событий, из которых они считались бы,
      // пока не существует (появятся с версиями/статусами после слияния веток).
      analytics: async () => {
        await delay(LATENCY);
        const projects = db.projects;
        const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
        const totalItems = projects.reduce((s, p) => s + p.items, 0);
        const myStyles = db.styles.filter((s) => s.owner !== null).length;

        // доля бюджета по стилям (донат)
        const byStyle = {};
        projects.forEach((p) => { byStyle[p.style || "Без стиля"] = (byStyle[p.style || "Без стиля"] || 0) + p.budget; });
        const styleSplit = Object.entries(byStyle)
          .map(([label, v]) => ({ label, value: totalBudget ? Math.round((v / totalBudget) * 100) : 0 }))
          .sort((a, b) => b.value - a.value);

        // траты по проектам (бары)
        const spendByProject = projects
          .map((p) => ({ label: p.name, value: p.budget }))
          .sort((a, b) => b.value - a.value);

        return clone({
          kpis: [
            { key: "proj", label: "Проектов сохранено", value: projects.length, unit: "abs" },
            { key: "items", label: "Предметов в сметах", value: totalItems, unit: "abs" },
            { key: "styles", label: "Своих стилей", value: myStyles, unit: "abs" },
          ],
          styleSplit,
          spendByProject,
          totalItems,
        });
      },
    },
    projects: {
      list: async () => { await delay(LATENCY); return clone(db.projects); }, // → GET /api/projects

      create: async (patch = {}) => {                                          // → POST /api/projects
        await delay(220);
        // статус — стадия петли (не «В работе»: старый словарь; миграция чинит только уже сохранённые строки)
        const row = { id: "p_" + Date.now(), name: "Новый проект", room: "Гостиная", style: "", area: 0, items: 0, budget: 0, updated: today(), cover: "living", status: "Сбор", ...patch };
        db.projects.unshift(row);
        LS.set("projects", db.projects);
        return clone(row);
      },
      update: async (id, patch) => {                                           // → PATCH /api/projects/:id
        await delay(160);
        const i = db.projects.findIndex((p) => p.id === id);
        if (i >= 0) { db.projects[i] = { ...db.projects[i], ...patch, updated: today() }; LS.set("projects", db.projects); }
        return clone(db.projects[i]);
      },
      remove: async (id) => {                                                   // → DELETE /api/projects/:id
        await delay(160);
        db.projects = db.projects.filter((p) => p.id !== id);
        LS.set("projects", db.projects);
        return { ok: true };
      },

      // → GET /api/projects/summary  (сводная аналитика по сохранённым проектам)
      summary: async () => {
        await delay(LATENCY);
        const projects = db.projects;
        const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
        const totalItems = projects.reduce((s, p) => s + p.items, 0);
        const avg = Math.round(totalBudget / projects.length);

        // распределение по стадиям петли (донат)
        const byStatus = {};
        projects.forEach((p) => { byStatus[p.status] = (byStatus[p.status] || 0) + 1; });
        const statusOrder = ["Сбор", "Согласование", "Закупка", "Сдача", "Архив"];
        const statusSplit = statusOrder
          .filter((s) => byStatus[s])
          .map((s) => ({ label: s, value: Math.round((byStatus[s] / projects.length) * 100) }));

        return clone({
          kpis: [
            { key: "count", label: "Проектов", value: projects.length, unit: "abs" },
            { key: "budget", label: "Общий бюджет", value: totalBudget, unit: "₽" },
            { key: "avg", label: "Средний бюджет", value: avg, unit: "₽" },
            { key: "items", label: "Предметов подобрано", value: totalItems, unit: "abs" },
          ],
          statusSplit,
          budgetByProject: projects.map((p) => ({ label: p.name, value: p.budget })).sort((a, b) => b.value - a.value),
          areaByRoom: projects.map((p) => ({ label: p.room, value: p.area })).sort((a, b) => b.value - a.value),
        });
      },
    },

    /* — Избранное (мудборд + шоп-лист) — */
    favorites: {
      list: async () => { await delay(LATENCY); return clone(db.favorites); }, // → GET /api/favorites
      remove: async (id) => {                                                   // → DELETE /api/favorites/:id
        await delay(180);
        db.favorites = db.favorites.filter((f) => f.id !== id);
        LS.set("favorites", db.favorites);
        return { ok: true };
      },
    },

    /* — Библиотека стилей (единый реестр: системные read-only + свои) — */
    styles: {
      list: async () => { await delay(140); return clone(db.styles); },        // → GET /api/styles
      get: async (id) => { await delay(80); return clone(db.styles.find((s) => s.id === id)); },
      create: async (patch = {}) => {                                          // → POST /api/styles
        await delay(160);
        const row = { id: "s_" + Date.now(), name: "Новый стиль", owner: "me", mood: "", desc: "", palette: ["#C57B57", "#E7D3C0", "#8A8175", "#2E2A28"], materials: ["дерево", "ткань", "металл"], decorLevel: "mid", factor: 1.0, ...patch };
        db.styles.push(row);
        LS.set("styles", db.styles);
        return clone(row);
      },
      duplicate: async (id) => {                                                // форк пресета в свой (Shopify «Copy of…»)
        await delay(160);
        const src = db.styles.find((s) => s.id === id);
        if (!src) return null;
        const copy = { ...clone(src), id: "s_" + Date.now(), name: src.name + " (копия)", owner: "me" };
        db.styles.push(copy);
        LS.set("styles", db.styles);
        return clone(copy);
      },
      update: async (id, patch) => {                                           // → PATCH /api/styles/:id (только свои)
        await delay(140);
        const i = db.styles.findIndex((s) => s.id === id);
        if (i >= 0 && db.styles[i].owner !== null) { db.styles[i] = { ...db.styles[i], ...patch }; LS.set("styles", db.styles); }
        return clone(db.styles[i]);
      },
      remove: async (id) => {                                                   // → DELETE /api/styles/:id (только свои)
        await delay(140);
        db.styles = db.styles.filter((s) => !(s.id === id && s.owner !== null));
        LS.set("styles", db.styles);
        return { ok: true };
      },
    },

    /* — Библиотека товаров студии (мастер-записи, волна B1). Все записи свои
         (системных пресетов нет). Нормализация схемы — через LedgerFFE.blankProduct
         (единый источник схемы; вызовы рантайм-асинхронные, модуль уже загружен). — */
    library: {
      list: async () => { await delay(120); return clone(db.library); },        // → GET /api/library
      get: async (id) => { await delay(70); return clone(db.library.find((p) => p.id === id)); },
      create: async (patch = {}) => {                                           // → POST /api/library
        await delay(150);
        const F = window.LedgerFFE;
        const body = F && F.blankProduct ? F.blankProduct(patch) : patch;
        if (F) body.priceDate = body.priceDate || today();  // новый товар — цена только что введена/собрана (волна B3)
        const row = { id: "lib_" + Date.now(), ...body, createdAt: today(), updatedAt: today() };
        db.library.push(row);
        LS.set("library", db.library);
        return clone(row);
      },
      update: async (id, patch) => {                                            // → PATCH /api/library/:id
        await delay(130);
        const i = db.library.findIndex((p) => p.id === id);
        if (i >= 0) {
          const F = window.LedgerFFE;
          const prev = db.library[i];
          const body = F && F.blankProduct ? F.blankProduct({ ...prev, ...patch }) : { ...prev, ...patch };
          // сравниваем ОБЕ стороны через ту же нормализацию (blankProduct), а не body
          // (нормализовано) vs prev (может быть «сырым» — строка/float из старой схемы
          // или внешнего импорта) — иначе '1000' !== 1000 ложно обнуляет priceDate
          const prevNorm = F && F.blankProduct ? F.blankProduct(prev) : prev;
          // цену поправили руками — проверили сейчас, пометка давности обнуляется (та же механика, что у позиций сметы)
          if (F && body.price !== prevNorm.price) body.priceDate = today();
          db.library[i] = { ...prev, ...body, updatedAt: today() };
          LS.set("library", db.library);
        }
        return clone(db.library[i]);
      },
      remove: async (id) => {                                                    // → DELETE /api/library/:id
        await delay(120);
        db.library = db.library.filter((p) => p.id !== id);
        LS.set("library", db.library);
        return { ok: true };
      },
    },

    /* — Каталог товаров ПОСТАВЩИКА (портал поставщиков, срез 3): то, что публикует
         сам поставщик в своём кабинете (артикул, варианты цвета, габариты, цена).
         Схема — та же LedgerFFE.blankProduct, что у библиотеки дизайнера (единый товар),
         но стор отдельный: это витрина поставщика, не личная библиотека дизайнера.
         → API: /api/supplier/catalog (скоуп по supplier_id из сессии). — */
    supplierCatalog: {
      list: async () => { await delay(120); return clone(db.supplierCatalog); },
      get: async (id) => { await delay(70); return clone(db.supplierCatalog.find((p) => p.id === id)); },
      create: async (patch = {}) => {
        await delay(150);
        const F = window.LedgerFFE;
        const body = F && F.blankProduct ? F.blankProduct(patch) : patch;
        if (F) body.priceDate = body.priceDate || today();
        const row = { id: "sc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), ...body, createdAt: today(), updatedAt: today() };
        db.supplierCatalog.push(row);
        LS.set("supplierCatalog", db.supplierCatalog);
        return clone(row);
      },
      update: async (id, patch) => {
        await delay(130);
        const i = db.supplierCatalog.findIndex((p) => p.id === id);
        if (i >= 0) {
          const F = window.LedgerFFE;
          const prev = db.supplierCatalog[i];
          const body = F && F.blankProduct ? F.blankProduct({ ...prev, ...patch }) : { ...prev, ...patch };
          const prevNorm = F && F.blankProduct ? F.blankProduct(prev) : prev;
          if (F && body.price !== prevNorm.price) body.priceDate = today();
          db.supplierCatalog[i] = { ...prev, ...body, updatedAt: today() };
          LS.set("supplierCatalog", db.supplierCatalog);
        }
        return clone(db.supplierCatalog[i]);
      },
      remove: async (id) => {
        await delay(120);
        db.supplierCatalog = db.supplierCatalog.filter((p) => p.id !== id);
        LS.set("supplierCatalog", db.supplierCatalog);
        return { ok: true };
      },
    },

    /* — Адресная книга поставщиков (K5a, паттерн Programa Address Book):
         карточки контактов централизованно; позиция сметы продолжает хранить
         поставщика строкой `sup`, карточка находится ПО ИМЕНИ (LedgerFFE.supplierMatch).
         Нормализация схемы — LedgerFFE.blankSupplier (как library ↔ blankProduct). — */
    suppliers: {
      list: async () => { await delay(120); return clone(db.suppliers); },       // → GET /api/suppliers
      get: async (id) => { await delay(70); return clone(db.suppliers.find((s) => s.id === id)); },
      create: async (patch = {}) => {                                            // → POST /api/suppliers
        await delay(150);
        const F = window.LedgerFFE;
        const body = F && F.blankSupplier ? F.blankSupplier(patch) : patch;
        // случайный суффикс против коллизии Date.now() при двух созданиях в одну мс (урок markupProfiles/K4)
        const row = { id: "spl_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8), ...body, createdAt: today(), updatedAt: today() };
        db.suppliers.push(row);
        LS.set("suppliers", db.suppliers);
        return clone(row);
      },
      update: async (id, patch) => {                                             // → PATCH /api/suppliers/:id
        await delay(130);
        const i = db.suppliers.findIndex((s) => s.id === id);
        if (i >= 0) {
          const F = window.LedgerFFE;
          const prev = db.suppliers[i];
          const body = F && F.blankSupplier ? F.blankSupplier({ ...prev, ...patch }) : { ...prev, ...patch };
          db.suppliers[i] = { ...prev, ...body, updatedAt: today() };
          LS.set("suppliers", db.suppliers);
        }
        return clone(db.suppliers[i]);
      },
      remove: async (id) => {                                                    // → DELETE /api/suppliers/:id
        await delay(120);
        db.suppliers = db.suppliers.filter((s) => s.id !== id);
        LS.set("suppliers", db.suppliers);
        return { ok: true };
      },
    },

    /* — Профили наценки дизайнера («мой стандарт»): базовая ставка + наценки
         по разделам + скидка/доставка/монтаж, чтобы не настраивать заново
         каждый новый проект (роадмап п.4, продолжение catMarkupPct) — */
    markupProfiles: {
      list: async () => { await delay(120); return clone(db.markupProfiles); },  // → GET /api/markup-profiles
      create: async (patch = {}) => {                                            // → POST /api/markup-profiles
        await delay(150);
        const defMarkup = (window.LedgerFFE && window.LedgerFFE.DEFAULT_MARKUP_PCT) || 25;
        // Date.now() один в один совпадает при двух созданиях в одну мс (напр. двойной клик
        // «Сохранить как стандарт») — оба профиля получали одинаковый id, второй React-key
        // дублировал первый; добавлен случайный суффикс
        const row = { id: "mp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8), name: "Мой стандарт", markupPct: defMarkup, catMarkupPct: {}, discountPct: 0, deliveryCost: 0, installCost: 0, extras: [], ...patch, createdAt: today() };
        db.markupProfiles.push(row);
        LS.set("markupProfiles", db.markupProfiles);
        return clone(row);
      },
      remove: async (id) => {                                                    // → DELETE /api/markup-profiles/:id
        await delay(120);
        db.markupProfiles = db.markupProfiles.filter((p) => p.id !== id);
        LS.set("markupProfiles", db.markupProfiles);
        return { ok: true };
      },
    },

    /* — «Недавнее» для ⌘K (Д3, W6): последние открытые проекты/разделы кабинета.
       Локальная история устройства, но за сигнатурой LedgerAPI, как вся персистенция
       (при переезде на бэкенд станет частью профиля). Без delay: это не «сеть». — */
    recents: {
      list: async () => clone(LS.get("recentVisits", [])),                     // → GET /api/recents
      push: async (kind, id) => {                                             // → POST /api/recents
        if (!id) return;
        const rest = LS.get("recentVisits", []).filter((r) => !(r.kind === kind && r.id === id));
        LS.set("recentVisits", [{ kind, id, at: Date.now() }, ...rest].slice(0, 6));
      },
      // удалённые проекты не должны занимать слоты истории — чистим по живому списку id
      prune: async (liveProjIds) => {
        const keep = LS.get("recentVisits", []).filter((r) => r.kind !== "proj" || liveProjIds.includes(r.id));
        LS.set("recentVisits", keep);
        return clone(keep);
      },
    },

    /* — Типовые комплектации-шаблоны (read-only библиотека) — */
    templates: {
      list: async () => { await delay(140); return clone(SPEC_TEMPLATES); },   // → GET /api/templates
    },

    /* — Новости дизайна (CRUD) — */
    news: {
      list: async ({ status } = {}) => {            // → GET /api/news
        await delay(LATENCY);
        let rows = clone(db.news);
        if (status) rows = rows.filter((n) => n.status === status);
        return rows.sort((a, b) => b.date.localeCompare(a.date));
      },
      get: async (id) => { await delay(200); return clone(db.news.find((n) => n.id === id)); }, // → GET /api/news/:id
      create: async (payload) => {                  // → POST /api/news
        await delay(300);
        const row = { id: "n_" + Date.now(), views: 0, author: (db.session && db.session.user.name) || "Редакция Design Ledger", ...payload };
        db.news.unshift(row);
        return clone(row);
      },
      update: async (id, patch) => {                // → PUT /api/news/:id
        await delay(300);
        const i = db.news.findIndex((n) => n.id === id);
        if (i >= 0) db.news[i] = { ...db.news[i], ...patch };
        return clone(db.news[i]);
      },
      remove: async (id) => {                        // → DELETE /api/news/:id
        await delay(300);
        db.news = db.news.filter((n) => n.id !== id);
        return { ok: true };
      },
    },

    /* — Пользователи (админка) — */
    users: {
      list: async () => { await delay(LATENCY); return clone(db.users); }, // → GET /api/admin/users
      setStatus: async (id, status) => {            // → PATCH /api/admin/users/:id
        await delay(250);
        const u = db.users.find((x) => x.id === id);
        if (u) u.status = status;
        return clone(u);
      },
    },

    /* — Аналитика для админ-дашборда (Яндекс Метрика / AppMetrica) — */
    analytics: {
      // → GET /api/admin/analytics?range=30d
      overview: async () => {
        await delay(LATENCY);
        const days = 14;
        const mkSeries = (b, v) => Array.from({ length: days }, (_, i) =>
          Math.round(b + Math.sin(i / 2) * v * 0.4 + Math.random() * v));
        return clone({
          kpis: [
            { key: "mau", label: "Активные за месяц", value: 18420, delta: +12.4, unit: "" },
            { key: "scans", label: "Смет собрано", value: 9260, delta: +8.1, unit: "" },
            { key: "ai", label: "AI-запросов советнику", value: 41730, delta: +21.7, unit: "" },
            { key: "conv", label: "Конверсия в проект", value: 34.6, delta: +3.2, unit: "%" },
          ],
          traffic: mkSeries(620, 240),      // визиты в день (Яндекс Метрика)
          aiEvents: mkSeries(1400, 700),    // события AI (AppMetrica)
          sources: [
            { label: "App Store", value: 42 },
            { label: "Прямые", value: 23 },
            { label: "Соцсети", value: 18 },
            { label: "Поиск", value: 11 },
            { label: "Реферал", value: 6 },
          ],
          styles: [
            { label: "Тёплый минимализм", value: 28 },
            { label: "Neo Deco", value: 22 },
            { label: "Сканди", value: 19 },
            { label: "Индустриальный", value: 16 },
            { label: "Бохо", value: 9 },
            { label: "Другое", value: 6 },
          ],
        });
      },
    },
  };
})();
