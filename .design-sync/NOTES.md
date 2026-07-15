# Design-sync notes — Design Ledger

- **Проект Claude Design:** `Design Ledger` — `c407cea2-6800-4d55-9a8b-3e0bb407b093`
  (https://claude.ai/design/p/c407cea2-6800-4d55-9a8b-3e0bb407b093).
- **Режим — off-script, только превью-карточки.** Полный конвертер `/design-sync`
  НЕ применим: у репо нет собираемой изолированной библиотеки компонентов —
  они общаются через `window.*`-глобалы и склеены по порядку загрузки (инвариант
  CLAUDE.md), Storybook/stories нет. Поэтому заливаем рукописные `@dsCard`
  HTML-превью из `web/design-system/` как визуальный референс канона.
- **Следствие:** дизайн-агент Claude Design получает ВИД канона, не импортируемые
  компоненты (нет `_ds_bundle.js`). Это осознанный выбор, не недоделка.
- **Ре-синк:** обновил карточку в `web/design-system/` → перезалей тем же
  `DesignSync(write_files)` в тот же projectId. Анкера `_ds_sync.json` нет —
  сверяем руками, это нормально для off-script.
- **Источник правды канона — `web/styles.css`.** Витрина — зеркало.
