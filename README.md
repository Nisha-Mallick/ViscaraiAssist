# 🌸 VISCARIAASSIST

> **Empowering Careers Through Seamless AI-Driven Guidance**  
Your personalized AI Career & Skills Advisor built for students and professionals to navigate the evolving job market.

---

## 🚀 Overview

**ViscariaAssist** is a next-gen platform that bridges the gap between **student potential** and **industry expectations**.  
It provides **personalized career guidance, skill-gap analysis, and AI-generated roadmaps** by leveraging **Google Gemini (Pro + Flash)** and **Firebase**.  

No more generic career advice. Each user gets a **custom roadmap**, **actionable skills to learn**, and **real-world job role insights** — all saved in their dashboard for continuous growth.

---

## ✨ Why ViscariaAssist?

🎯 **Problem We Solve**  
Students in India often face confusing career choices, outdated counseling methods, and lack clarity on emerging roles.  
Our solution dynamically adapts to their profile and provides **personalized AI guidance**.

💡 **Our Innovation**  
We integrate **Generative AI + Real-time Data + Skill Analysis** in a single platform with:  
- Personalized survey-driven insights  
- Career recommendations in **3 categories**: *Current Market, Local Opportunities, Future Roles*  
- AI-generated **Skill Gap Analysis**  
- **Zero-to-Hero Roadmap (PDF-ready)** for each chosen career role  
- Voice-enabled chat + persistent memory  

---

## 🛠️ Tech Stack

We carefully selected a **scalable, lightweight, and modern stack**:

### 🔹 Frontend
- 🌐 **HTML5**
- 🎨 **Tailwind CSS**
- ⚡ **JavaScript (ESM)**

### 🔹 Backend
- 🟢 **Node.js + Express**
- 🤖 **Google Gemini 2.5 Pro** – Deep analysis (survey, skill gap, roadmap)  
- ⚡ **Google Gemini 2.5 Flash** – Real-time chat & career Q&A  

### 🔹 Database & Auth
- 🔥 **Firebase Firestore** – Real-time storage of survey answers, chats, roadmaps  
- 🔑 **Firebase Auth** – Secure authentication  

### 🔹 Other Integrations
- 📄 **JsPDF** – Client-side roadmap PDF generation  
- ☁️ **Google Drive (fallback)** – PDF storage  
- 🖼️ **Cloudinary** – Profile picture storage  
- 🎤 **Web Speech API** – Voice-to-text in chat  

---

## 📸 Key Features

-  Secure Login with Firebase

-  Survey-based personalization (interests, skills, strengths)

-  AI-Powered Career Suggestions across 3 categories

-  Skill Gap Analyzer with % match & missing skills

- 🗺 AI Roadmap Generator (downloadable PDF)

-  Chat Window with persistent memory stored in Firestore

 -  Voice-enabled inputs for accessibility

-  Dashboard with goals, skills, and roadmaps

---


## 📂 Project Structure

```
ViscariaAssist/
├── frontend/
│   ├── index.html
│   ├── career-assist.js
│   ├── take-test.js
│   └── styles.css
├── backend/
│   ├── server.js
│   └── package.json
├── firestore/
│   └── users, surveys, chats collections
└── README.md
```

---
## ⚙️ Getting Started
### Prerequisites

- Node.js >= 18

- npm >= 9

- Firebase project setup

- Google AI Studio API Key

---

## 🖥️ Installation
```
# Clone the repository
git clone https://github.com/<your-username>/ViscariaAssist

# Navigate into backend
cd ViscariaAssist/backend

# Install dependencies
npm install
```
## ▶️ Run Locally
```
# Start backend
npm start

# Open frontend (with Live Server or Firebase Hosting)
```
