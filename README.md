# 🍅 WidgetDoro

**WidgetDoro** is a premium, lightweight Pomodoro timer designed to keep you focused. Built with React and powered by Tauri, it functions as both a sleek web application and a native desktop widget that stays out of your way while keeping you on track.

---

## ✨ Features

- **🎯 Focus Modes**: Seamlessly switch between Focus, Short Break, and Long Break sessions.
- **🖥️ Desktop Widget**: A frameless, transparent, "always-on-top" desktop experience powered by Tauri.
- **📦 Picture-in-Picture**: Supports web-native Picture-in-Picture for a floating timer even in the browser.
- **🎨 Modern Aesthetics**: Dark mode by default with smooth animations and a premium glassmorphism feel.
- **🔊 Audio Notifications**: Subtle audio cues to signal the end of a session.
- **⚙️ Fully Customizable**: Adjust session durations and sound settings to fit your workflow.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or later)
- **Rust** (Optional: Only if you want to build the desktop app locally)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

To run the web version in development mode:
```bash
npm run dev
```

---

## 🖥️ Desktop Application (Tauri)

WidgetDoro is designed to be packaged as a native desktop application. 

### Local Development
If you have Rust installed, you can run the desktop version locally:
```bash
npm run tauri dev
```

### Cloud Builds (GitHub Actions)
This project is configured with **GitHub Actions**. You don't need to install heavy build tools locally to get the desktop app:
1. Push your code to GitHub.
2. Go to the **Actions** tab.
3. Once the build finishes, download the `.exe` or `.msi` from the **Releases** section.

---

## 🛠️ Built With

- [React](https://reactjs.org/) - Frontend Framework
- [Vite](https://vitejs.dev/) - Build Tool
- [Tauri](https://tauri.app/) - Desktop Framework
- [Motion](https://motion.dev/) - Animation Library
- [TailwindCSS](https://tailwindcss.com/) - Styling

---

## 👤 Author

**Syed Mubashir Ahmed**  
[smubashirahmed@hotmail.com](mailto:smubashirahmed@hotmail.com)
