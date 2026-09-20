
# EVA NEXUS

### A Futuristic NASA Data Interface with Dual AI Chatbots

EVA NEXUS is a futuristic, browser-based space research and AI interface designed by **Eva Patel**. It combines publicly available NASA data, local browser-based AI, interactive telemetry-inspired visualizations, and two distinct chatbot experiences in a cyberpunk-inspired interface. If you want to view what it looks like, make sure you go to the screenshots folder and look at the screenshot :)

This project is also deployed through Github Pages, so it is accessible through the web.

The project is designed to make space data, research, programming, and learning more accessible through an interactive digital environment that runs directly in the browser.

> **Project Status:** Active personal project  
> **Deployment:** GitHub Pages  
> **Architecture:** Static HTML, CSS, and JavaScript  
> **AI:** Browser-based local inference where supported  
> **Author:** Eva Patel

---

## Overview

EVA NEXUS is built around the idea of creating a personal space-data command interface that combines research tools with accessible AI assistance.

The project includes two separate chatbot interfaces, each designed for a different purpose:

1. **General Instant Chatbot** — Fast assistance for everyday questions, programming, schoolwork, mathematics, writing, and technology.
2. **NASA Research Core Chatbot** — A research-oriented interface that retrieves relevant public NASA data, calculates derived statistics, and provides responses with source context, methodology, and limitations.

The interface also includes space-data dashboards, visual status panels, public data feeds, and a futuristic responsive design.

---

## Features

### Dual AI Chatbot System

#### 1. General Instant Chatbot

The General Instant Chatbot is designed for fast, practical assistance.

Potential use cases include:

- Everyday questions
- Programming concepts
- HTML, CSS, and JavaScript
- Python
- Mathematics
- Schoolwork assistance
- Writing and brainstorming
- Technology explanations
- Beginner-friendly learning support

The chatbot uses immediate local responses for common questions and can use a browser-based local model for more complex questions when the required model is available.

#### 2. NASA Research Core Chatbot

The NASA Research Core Chatbot is designed for space-related research and public-data exploration.

Potential capabilities include:

- Retrieving relevant public NASA data
- Exploring near-Earth objects
- Reviewing solar activity
- Exploring NASA Astronomy Picture of the Day information
- Exploring NASA Earth events
- Calculating derived statistics
- Providing source context
- Explaining methodology
- Identifying limitations in available data
- Distinguishing reported values from calculated values

The research chatbot is designed to communicate uncertainty and should not be treated as an official NASA mission-control system.

---

## Public Data Sources

EVA NEXUS can use publicly available space-related data sources, including:

- NASA Near Earth Object Web Service (NeoWs)
- NASA DONKI space-weather data
- NASA Astronomy Picture of the Day (APOD)
- NASA Earth Observatory Natural Event Tracker (EONET)
- Public third-party ISS position data where supported

Data availability depends on the source, browser compatibility, rate limits, network connectivity, and API accessibility.

### Data Accuracy Disclaimer

EVA NEXUS is an independent project and is **not an official NASA product, NASA mission-control interface, or NASA-affiliated system**.

The interface may display:

- Publicly reported data
- Derived calculations
- Approximate values
- Third-party information
- Cached or unavailable information

A displayed value should not automatically be interpreted as official NASA telemetry, an operational warning, or a prediction of an imminent event.

The project attempts to distinguish between source-reported information and values calculated by the application.

---

## Technology Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Responsive layouts
- CSS animations
- Glassmorphism-inspired interface elements
- Cyberpunk-inspired visual design
- Interactive dashboard components

### AI

- Browser-based local inference where supported
- Transformers.js-compatible models
- WebGPU acceleration where available
- WASM fallback where supported
- Local browser execution without requiring a personal cloud AI API key

The availability and performance of local AI depend on the user's browser, hardware, memory, model size, and supported acceleration features.

### Data

- Public NASA APIs
- Public space-data services
- Browser-based data retrieval
- Client-side calculations

### Hosting

- GitHub Pages
- Static web hosting
- No required Python server for the GitHub Pages edition

---

## Running the Project

### Option 1: GitHub Pages

1. Create a GitHub repository.
2. Upload the project files.
3. Ensure `index.html` is located in the repository's root directory.
4. Open the repository's **Settings**.
5. Select **Pages**.
6. Under **Build and deployment**, choose:
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/ (root)`
7. Save the configuration.
8. Wait for GitHub Pages to deploy the website.

Your website will be available at your GitHub Pages URL.

### Option 2: Run Locally

You can run the static project using Python's built-in HTTP server.

Open a terminal inside the project directory and run:

```bash
py -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You may also use another static HTTP server of your choice.

---

## Browser-Based AI Considerations

The local AI functionality may require the browser to download a model the first time it is used.

Initial model loading may take time and can require significant:

- RAM
- Storage
- CPU resources
- GPU resources
- Network bandwidth

Performance varies depending on the device and browser.

The local model may produce inaccurate, incomplete, or outdated answers. AI-generated responses should be reviewed and independently verified, especially when used for academic, technical, scientific, or safety-related purposes.

EVA NEXUS does not guarantee that AI-generated information is correct.

---

## Project Structure

```text
EVA-NEXUS/
│
├── index.html
├── README.md
├── LICENSE
├── .nojekyll
│
└── assets/
    ├── app.js
    └── style.css
```

The exact structure may change as the project develops.

---

## Design Philosophy

EVA NEXUS combines the visual language of:

- Futuristic operating systems
- Space-data interfaces
- Scientific dashboards
- Cyberpunk design
- Minimalist information architecture
- Interactive digital assistants

The goal is to create an interface that feels immersive while remaining useful, readable, and responsive.

The project prioritizes:

- Clear information presentation
- Accessible interactions
- Responsive design
- Source transparency
- Separation between research data and generated responses
- A distinctive visual identity

---

## Limitations

EVA NEXUS has several limitations:

- Public APIs may experience downtime.
- Some sources may enforce rate limits.
- Browser CORS restrictions may prevent certain requests.
- GitHub Pages does not run a Python backend.
- Local AI performance depends on the user's device.
- Public data may be delayed, incomplete, or revised.
- Third-party services may change their APIs.
- AI responses may contain errors.
- The application is not an official mission-control or emergency-monitoring system.

When a data source is unavailable, the application should display an unavailable state rather than presenting fabricated information.

---

## Responsible Use

EVA NEXUS is intended for:

- Educational exploration
- Personal experimentation
- Software development practice
- Public space-data research
- Interface design
- AI experimentation
- Learning and demonstrations

Do not use this project as the sole source for:

- Emergency decisions
- Aviation or aerospace operations
- Medical decisions
- Financial decisions
- Security-critical operations
- Official scientific reporting
- Mission-control activities

Always verify important information using authoritative sources.

---

## Third-Party Services and Libraries

This project may interact with third-party services, APIs, libraries, models, and external resources.

These third-party components may be subject to their own:

- Terms of service
- Privacy policies
- Licenses
- Usage restrictions
- Rate limits
- Attribution requirements

Users are responsible for reviewing and complying with the applicable terms of each third-party service or component they use.

NASA data and services are not intended to imply NASA endorsement, sponsorship, or affiliation with EVA NEXUS.

---

## Copyright

Copyright © 2026 Eva Patel. All rights reserved.

The EVA NEXUS name, original interface design, original source code, visual identity, custom-written content, and project-specific implementation are protected to the extent provided by applicable law.

See the `LICENSE` file for usage restrictions.

---

## Author

**Eva Patel**

Aspiring software engineer, AI/ML engineer, full-stack developer, technical writer, and STEM educator.

EVA NEXUS is an independent project created as part of an ongoing exploration of software engineering, artificial intelligence, public data, and interactive digital experiences.

---

## License

This project is distributed under a proprietary, all-rights-reserved license.

You may not copy, modify, distribute, republish, sublicense, sell, or reuse the project's original source code, design, or assets without prior written permission from the copyright holder.

See the `LICENSE` file for complete terms.
