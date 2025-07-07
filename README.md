# 🛡️ SpyMe – Mic & Camera Access Detector (Web Simulation)

## 🔐 A Cybersecurity Web App Demo to Raise Privacy Awareness

**SpyMe** is a **web-based simulation** of a mobile privacy protection tool that alerts users when apps access sensitive resources like the **microphone** or **camera**. Originally intended as a native Android application, this web version is designed to **demonstrate core cybersecurity principles** using **mock triggers** and **real-time Firebase logging**.

---

## 🎯 Project Goal

To simulate how privacy breaches (e.g., hidden mic or cam access by background apps) can be **detected and logged**, helping users visualize the importance of digital surveillance awareness.

---

## ✅ Core Features

* 🔍 **Simulated Mic/Camera Access Detection**
  Triggered via buttons for demonstration.

* 📲 **App Selector**
  Choose apps like Instagram, WhatsApp, etc., to simulate which app accessed your mic or camera.

* 🔔 **Firebase Alerts**
  Sends logs in real time to **Firebase Realtime Database** under `/alerts/{timestamp}` with structure:

  ```json
  {
    "app": "Instagram",
    "type": "microphone",
    "time": "2025-07-07 15:30"
  }
  ```

* 🗃️ **Live Access Log Viewer**
  Displays a scrollable history of all simulated access events.

* 🟢 **Monitoring Toggle**
  Enable or disable detection simulation.

---

## 🧰 Tech Stack

* HTML5, CSS3, JavaScript (Vanilla)
* Firebase Realtime Database (for alerts & logs)
* Responsive UI design using Material/Bootstrap principles
* Fully compatible with **Replit** and modern browsers

---

## 💡 Educational Purpose

This project is built for **academic use** in a **cybersecurity course** to:

* Demonstrate how user privacy can be monitored ethically
* Simulate mic/camera access without real permissions
* Show how cloud logging (Firebase) enhances transparency

---

## 📌 Disclaimer

This is a **simulation**. It does **not access real hardware** like mic or camera. It is designed for ethical learning, awareness, and college-level demonstration only.

---

## 📂 How to Run

1. Clone or unzip this project in Replit or your local machine.
2. Add your Firebase `firebase-config.js` credentials.
3. Open `index.html` in browser or Replit preview.
4. Use buttons and toggle to simulate access and watch real-time updates.
