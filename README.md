# NILORA — Smart & Sustainable Agriculture 🌱

**NILORA** is a farmer-centered agricultural decision-support platform developed by **Team Fe el-Kosa** for the **2026 NASA Space Apps Challenge**, under the challenge **“Field Shift: Adapting Farms with NASA Data.”**

The project explores how Earth-observation and climate information can be presented in a practical, understandable way to help farmers and agricultural professionals review field conditions and make better-informed decisions.

<p align="center">
  <a href="https://nilora2026.vercel.app/"><strong>🌐 Open NILORA</strong></a>
  &nbsp;·&nbsp;
  <a href="https://nilora2026.vercel.app/demo.html"><strong>▶ View Project Demo</strong></a>
</p>

---

## The Challenge

Farmers face changing temperatures, rainfall variability, water stress, and other environmental pressures. Satellite and climate datasets can help reveal important patterns, but raw scientific data is not always easy to interpret or apply in everyday farm management.

NILORA aims to bridge that gap by bringing selected Earth-observation resources into a simple web experience, connecting location-based climate information with maps, field records, and evidence-aware agricultural guidance.

## What NILORA Offers

- **Farm onboarding:** Users can create a farm profile, add location details, and select or adjust the farm location on an interactive map.
- **Farm overview:** A central dashboard brings together saved farm information, climate indicators, satellite imagery, and practical farming tips.
- **NASA climate insights:** Location-based temperature, relative humidity, wind, and precipitation information from NASA POWER, including recent climate history and charts.
- **Satellite map:** Interactive map views with NASA GIBS imagery layers, date selection, and field-location context.
- **Evidence-aware recommendations:** Guidance that uses available field and climate information, explains its evidence and limitations, and avoids presenting unsupported diagnoses.
- **Reports archive:** A place to review saved field analyses and export report views.
- **Agricultural marketplace:** A catalogue for farm supplies and produce, with member-submitted listings, product details, and a request-list/cart experience.
- **Farming community:** A space for members to share posts, ask questions, comment, like, and follow other members.
- **NILORA AI:** A bilingual Arabic/English agricultural assistant interface for general questions about crops, soil, irrigation, climate, and satellite insights.
- **Research & data resources:** A reference page describing the external datasets connected to the project.

Some experiences are prototypes or depend on account setup and connected services. The Baraka Robot page is currently an under-development concept.

## NASA & Earth-Observation Resources

NILORA currently connects to the following NASA resources:

| Resource | How it is used | Official link |
| --- | --- | --- |
| **NASA POWER** | Retrieves gridded meteorological and solar parameters for saved farm coordinates. NILORA uses available parameters such as air temperature, relative humidity, wind speed, precipitation, and solar radiation in its climate views. | [NASA POWER](https://power.larc.nasa.gov/) |
| **NASA GIBS** | Supplies satellite imagery tiles for the interactive map experience. Imagery provides regional visual context and is not treated as a surveyed field boundary or crop diagnosis. | [NASA GIBS](https://www.earthdata.nasa.gov/data/tools/gibs) |

### Additional Earth-observation resource

- **Copernicus Sentinel-2 / STAC (European Space Agency / Copernicus):** Catalogue metadata is used for imagery discovery and exploration. This does not mean that every Sentinel-2 product is processed within NILORA. [Copernicus Data Space](https://dataspace.copernicus.eu/)

## How It Works

1. A user creates an account and completes the farm profile.
2. NILORA stores the user's farm and field information in the connected Supabase project.
3. Saved coordinates are used to request available climate parameters from the NASA POWER API.
4. The satellite map requests imagery tiles from NASA GIBS for the selected layer, date, and map view.
5. The recommendations experience evaluates the available information and presents guidance only where the available evidence is sufficient.
6. Users can review analysis history, use the community and marketplace experiences, and consult the agricultural assistant.

## Technology Stack

| Area | Tools and technologies |
| --- | --- |
| Front end | HTML5, CSS3, JavaScript |
| Authentication & data | Supabase Auth, Supabase Database, Supabase Storage |
| Climate data | NASA POWER REST API |
| Satellite imagery | NASA GIBS tile services |
| Interactive maps | Leaflet |
| Charts & visualization | Chart.js and custom JavaScript visualizations |
| Other Earth-observation catalogue | Copernicus Data Space / STAC |
| UI assets | Iconify, Google Fonts |
| Design & collaboration | Figma, GitHub |
| Hosting | Vercel |

The project is built as a static, multi-page web application. It does not require a React, Vite, or Node build step.

## Responsible Use & Data Limitations

- NASA POWER values are gridded estimates, not readings from sensors installed in a user's field.
- Satellite imagery is provided for visual context. It is not, by itself, a crop-health diagnosis or a verified field boundary.
- NILORA does not claim to provide laboratory soil measurements, guaranteed yield forecasts, or an independently validated machine-learning crop-diagnosis model.
- Recommendations are decision-support guidance, not a replacement for farmers, qualified agricultural engineers, or local agricultural extension services.
- Users should verify field conditions locally before acting on recommendations, especially when decisions involve irrigation, fertilizers, or crop-protection products.
- Marketplace prices and availability are indicative and should be confirmed directly with the seller.

## Super Intelligence (SI) Disclosure

AI tools, including ChatGPT, were used as development assistants during the project. Their use included support with code drafting and refinement, debugging, technical explanations, and writing/editing project text. The team reviewed and integrated the resulting work into the project. The application should not be interpreted as a custom-trained AI or machine-learning model unless explicitly identified as such in a future implementation.

## Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/ahmedmubarak2010/nilora2026.git
   cd nilora2026
   ```
2. Configure the Supabase project values in `config.js` using the public project URL and publishable/anon key expected by the client configuration:
   ```js
   window.NILORA_CONFIG = {
     supabaseUrl: "YOUR_SUPABASE_PROJECT_URL",
     supabaseAnonKey: "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
   };
   ```
3. Ensure the Supabase database tables, Storage buckets, authentication providers, and Row Level Security policies required by the application are configured in your Supabase project.
4. Serve the repository root with any static web server, or deploy it to Vercel.

**Security note:** Never put a Supabase service-role key, private API key, or other secret in browser-side code. Use appropriate Row Level Security policies for database access.

## Repository Guide

| Path | Purpose |
| --- | --- |
| `index.html` | Public project landing page |
| `signup.html` | Sign-in and account creation |
| `auth-callback.html` | Authentication callback |
| `reset-password.html` | Password recovery |
| `onboarding.html` | Farm profile and location setup |
| `farmer-dashboard.html` | Farm profile and field information |
| `overview.html` | Main overview, NASA POWER climate views, and satellite imagery |
| `satellite-map.html` | Interactive satellite and climate map |
| `recommendations.html` | Evidence-aware agricultural guidance |
| `reports.html` | Saved analysis reports |
| `agri-marketplace.html` | Agricultural marketplace |
| `community.html` | Community feed |
| `community-post.html`, `community-profile.html` | Community discussions and member profiles |
| `ai-assistant.html` | NILORA AI assistant interface |
| `baraka-ai.html` | Baraka Robot concept page (under development) |
| `data-resources.html` | External data source references |
| `demo.html` | Seven-slide project demonstration |
| `assets/` and `Assets/` | Shared scripts, styles, logos, and images |
| `config.js` | Public Supabase client configuration |

## Links

- **Live website:** https://nilora2026.vercel.app/
- **Project demonstration:** https://nilora2026.vercel.app/demo.html
- **GitHub repository:** https://github.com/ahmedmubarak2010/nilora2026
- **Linkedin :** https://www.linkedin.com/company/nilora2026
- **Linktree:** https://linktr.ee/nilora

---

**Built by Team Fe el-Kosa** · 2026 NASA Space Apps Challenge  
*Making Earth-observation insights easier to understand and use in agriculture.*
