# Municipal Service Dashboard

Run from the repository root with `npm run dev:municipal`. API: `http://localhost:4003`; web: `http://localhost:5175`.

## GitHub Pages

Pushing to `main` deploys the dashboard frontend to `https://lm23ghost.github.io/CLO2TECH/` through the `Deploy Municipal Dashboard` workflow. In the repository settings, set **Pages** to **GitHub Actions** as the source.

GitHub Pages hosts only static files. To enable live citizen reports, workflows, and transparency data in the deployed dashboard, host the Express API separately and add its `/api/v1` URL as the `MUNICIPAL_API_URL` repository variable. Local development continues to use `http://localhost:4003/api/v1` by default.
