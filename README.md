# 🚀 IntellMeet – AI-Powered Enterprise Meeting & Collaboration Platform

> A production-grade full-stack MERN application that combines real-time video meetings, AI-powered meeting intelligence, team collaboration, and task management for modern organizations.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-brightgreen?logo=mongodb)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Status](https://img.shields.io/badge/Status-In%20Development-orange)

---

# 📖 Overview

**IntellMeet** is an AI-powered enterprise collaboration platform built using the **MERN Stack**. It enables teams to conduct secure online meetings, collaborate in real time, generate AI-based meeting summaries, manage tasks, and improve productivity through intelligent automation.

The application is designed for remote and hybrid teams, providing an all-in-one solution for communication, collaboration, and project management.

---

# ✨ Features

### 🔐 Authentication

* User Registration
* Secure Login
* JWT Authentication
* Password Encryption (bcrypt)
* Protected Routes

### 🎥 Video Meetings

* Create & Join Meetings
* HD Video & Audio Calls
* Screen Sharing
* Participant Management

### 💬 Real-Time Communication

* Live Chat
* Instant Notifications
* Typing Indicators
* Socket.io Integration

### 🤖 AI Meeting Intelligence

* Speech-to-Text Transcription
* AI Meeting Summary
* Action Item Extraction
* Smart Meeting Insights

### 📋 Project Management

* Team Workspaces
* Kanban Task Board
* Task Assignment
* Progress Tracking

### 📊 Dashboard

* Meeting History
* Productivity Analytics
* Team Statistics
* User Profile Management

---

# 🛠 Tech Stack

## Frontend

* React 19
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* Zustand
* TanStack Query

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* bcrypt

## Real-Time Technologies

* Socket.io
* WebRTC

## AI Integration

* OpenAI API
* Whisper API (Optional)

## Deployment

* Vercel
* Render
* Docker
* GitHub Actions

---

# 📂 Project Structure

```text
IntellMeet/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── context/
│   │   └── utils/
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── sockets/
│   ├── services/
│   └── utils/
│
├── README.md
├── package.json
└── .env
```

---

# ⚙️ Installation

## Clone the Repository

```bash
git clone https://github.com/yourusername/intellmeet.git

cd intellmeet
```

---

## Backend Setup

```bash
cd server

npm install

npm run dev
```

---

## Frontend Setup

```bash
cd client

npm install

npm run dev
```

---

# 🔑 Environment Variables

Create a `.env` file inside the **server** directory.

```env
PORT=5000

MONGO_URI=your_mongodb_connection

JWT_SECRET=your_secret_key

OPENAI_API_KEY=your_openai_key

CLOUDINARY_CLOUD_NAME=your_cloud_name

CLOUDINARY_API_KEY=your_api_key

CLOUDINARY_API_SECRET=your_api_secret
```



# 🏗 System Architecture

```text
React Client
      │
      ▼
Node.js + Express API
      │
      ├──────── JWT Authentication
      │
      ├──────── Socket.io
      │
      ├──────── WebRTC
      │
      ▼
MongoDB Database
      │
      ▼
OpenAI API
```

---

# 🚀 Future Enhancements

* Meeting Recording
* Calendar Integration
* Email Notifications
* Mobile Application
* Multi-language Support
* AI Productivity Insights
* Whiteboard Collaboration
* File Sharing
* Voice Commands

---

# 🧪 Testing

```bash
npm test
```

---

# 📈 Performance Goals

* Secure Authentication
* Responsive UI
* Low-Latency Real-Time Communication
* Scalable Backend Architecture
* AI-Powered Meeting Intelligence
* Optimized API Performance

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Push to your branch.
5. Open a Pull Request.

---

# 📄 License

This project is developed for educational and internship purposes.

---

# 👨‍💻 Author

**Divyanshu Jaiswal**

* 🎓 B.Tech CSE Student
* 🌐 MERN Stack Developer
* 💻 Full Stack Web Developer
* 🔒 Cybersecurity Enthusiast

**LinkedIn:** https://www.linkedin.com/in/divyanshujaiswal410/

**Email:** [divyanshujaiswal0009@gmail.com]

---

# ⭐ Support

If you found this project helpful, consider giving it a ⭐ on GitHub. Your support is appreciated!

---

## Thank You

Thank you for visiting this repository. Feedback and suggestions are always welcome.
