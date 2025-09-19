
<table>
  <tr>
    <td>
      <img src=https://github.com/Nisha-Mallick/ViscaraiAssist/blob/main/Clogo_image.png
           alt="ViscariaAssist Logo" width="70" height="70"/>
    </td>
    <td style="padding-left: 15px; vertical-align: middle;">
      <h1 style="margin: 0;">VISCARIAASSIST</h1>
    </td>
  </tr>
</table>

> **Empowering Careers Through Seamless AI-Driven Guidance**  
Your personalized AI Career & Skills Advisor built for students and professionals to navigate the evolving job market.

---

## 🚀 Overview

**ViscariaAssist** is a next-gen platform that bridges the gap between **student potential** and **industry expectations**.  
It provides **personalized career guidance, skill-gap analysis, and AI-generated roadmaps** by leveraging **Google Gemini (Pro + Flash)** and **Firebase**.  

No more generic career advice. Each user gets a **custom roadmap**, **actionable skills to learn**, and **real-world job role insights** — all saved in their dashboard for continuous growth.

---

## ✨ Why ViscariaAssist?

  **Problem We Solve**  
Students in India often face confusing career choices, outdated counseling methods, and lack clarity on emerging roles.  
Our solution dynamically adapts to their profile and provides **personalized AI guidance**.

  **Our Innovation**  
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
- <p><img src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white" alt="HTML5"/>
-  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/>
-  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript"/>
</p>

### 🔹 Backend
- <p> <img src="https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white" alt="Node.js"/></p>
-  **Google Gemini 2.5 Pro** – Deep analysis (survey, skill gap, roadmap)  
-  **Google Gemini 2.5 Flash** – Real-time chat & career Q&A  

### 🔹 Database & Auth
- 🔥 **Firebase Firestore** – Real-time storage of survey answers, chats, roadmaps  
- 🔑 **Firebase Auth** – Secure authentication  

### 🔹 Other Integrations
-  **JsPDF** – Client-side roadmap PDF generation  
-  **Google Drive (fallback)** – PDF storage  
-  **Cloudinary** – Profile picture storage  
-  **Web Speech API** – Voice-to-text in chat  

---

## 📸 Key Features

-  Secure Login with Firebase

-  Survey-based personalization (interests, skills, strengths)

-  AI-Powered Career Suggestions across 3 categories

-  Skill Gap Analyzer with % match & missing skills

-  AI Roadmap Generator (downloadable PDF)

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
## 📖 Usage

- Login or Signup via Firebase Auth

- Start survey → Answer guided questions

- Get career suggestions across Current Market, Local, Future

- Choose a career role → See skill gap analysis

- Generate 10-step personalized roadmap

- Download roadmap as PDF + track progress in dashboard

- Continue chatting with AI for career queries

---

## 🧑‍💻 Contributors

### Team ViscariaAssist
Built for Google Gen AI Exchange Hackathon 2025 with passion.

## ⭐ Future Enhancements
- Multilingual career guidance (Hindi, Bengali, Tamil, etc.)

-  Mobile app version
  
---  
## 🔄 Process Flow

```mermaid
flowchart TD
    A[User Login] --> B[Takes Career Survey]
    B --> C[ Gemini Pro: Analyze Profile]
    C --> D[ AI Career Suggestions 3 Categories]
    D --> E[ User Chooses Career Role]
    E --> F[ Gemini Pro: Skill Gap Analysis]
    F --> G[ AI Roadmap Generated 10 Steps]
    G --> H[ Roadmap PDF Created & Saved]
    H --> I[ Dashboard: Goals, Skills, Roadmap]
    I --> J[ Ongoing Chat with Gemini Flash]
    J --> K[ Voice Support + Persistent Memory]
