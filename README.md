# AdminLTE MVC + Mongo (Express + EJS)

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
# open http://localhost:3000
```

- `/auth/register` to create a user
- `/auth/login` to sign in
- Protected dashboard at `/`



## Assets (CSS/JS)
- `public/vendor/adminlte/adminlte.css` is a local wrapper that @imports AdminLTE 4 CSS from jsDelivr.
- You can replace it with a full offline bundle later by downloading `adminlte.min.css` and saving it at the same path.
- Other vendor assets (Bootstrap, Icons, OverlayScrollbars) are currently loaded via CDN in layouts.
- Add your overrides in `public/css/custom.css`.
