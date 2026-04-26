# Screenshots

Drop PNG or JPG files in this folder with these exact filenames so they render in the main README.

| Filename | What to capture |
|---|---|
| `hero.png` | Wide banner shot at the top of the README. The home page hero with the search bar + map visible. Aim for 1600×800 or similar wide aspect. |
| `home.png` | Full home page — hero, "How It Works", featured properties. |
| `properties-list.png` | The `/properties` page with the grid view showing several listings, filters visible on the side. |
| `property-detail.png` | A single property detail page — image gallery, amenities, map, and a review or two if you've seeded data. |
| `add-property.png` | The Add Property form with the location picker map expanded. |
| `dashboard.png` | Logged-in user dashboard — favorites, scheduled visits, notification bell dropdown open. |
| `admin.png` | Admin panel — reports queue or broker verification view. |

## How to capture

**Windows:** Use the built-in **Snipping Tool** (Win + Shift + S) or **ScreenToGif** (free) for animated captures.

**Tips:**
- Seed the demo data first (`supabase/seed.sql`) so listings, reviews, and notifications are populated.
- Take shots in **both light and dark mode** if you want to flex the theme toggle — dark mode usually photographs better for portfolio banners.
- Crop to a consistent aspect ratio per row so the table in the README lines up nicely.
- Keep file sizes under ~500 KB each; use [TinyPNG](https://tinypng.com/) if they're heavier.

## Optional: demo GIF

Recording a 30–60 second walkthrough GIF (search a city → open a listing → favorite it → schedule a visit → see the notification) and saving it as `docs/screenshots/demo.gif` is the single most effective thing you can add. Swap the `hero.png` reference in `README.md` for `demo.gif` to use it as the banner.
