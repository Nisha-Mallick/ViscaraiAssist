// ----------------------- take-test.js --------------------------------
const $ = (selector) => document.querySelector(selector);

// ----------------------- This helper helps us to save current location of user for redirect ------------------
function attachLoginButtons() {
  document.querySelectorAll(".btn-login").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // store the page user came from
      localStorage.setItem("redirectAfterLogin", window.location.pathname + window.location.search);
      window.location.href = "./login.html";
    });
  });
}
attachLoginButtons(); 

import { authFetch } from './utils/authFetch.js';
import { API_BASE } from './config/api.js';

// -------- TEST ENGINE (MOCK & APTITUDE) ---------
class TestEngine {
  constructor(type, prefix) {
    this.type = type; // 'mock' or 'aptitude'
    this.prefix = prefix; // 'mock', 'mockSm', 'apt', 'aptSm'
    
    this.questions = [];
    this.answers = [];
    this.currentIndex = 0;
    this.sessionId = null;
    
    this.qWrap = document.getElementById(`${prefix}QWrap`);
    this.loader = document.getElementById(`${prefix === 'mockSm' ? 'mockLoaderSm' : prefix === 'aptSm' ? 'aptLoaderSm' : type === 'mock' ? 'mockLoader' : 'aptLoader'}`);
    this.startBtn = document.getElementById(`start${prefix.charAt(0).toUpperCase() + prefix.slice(1)}`);
    this.retestBtn = document.getElementById(`retest${prefix.charAt(0).toUpperCase() + prefix.slice(1)}`);
    
    // Dropdown selectors
    this.topicSelect = document.getElementById(`${prefix === 'mockSm' ? 'mockTopicSmSelect' : prefix === 'aptSm' ? 'aptTopicSmSelect' : prefix === 'mock' ? 'mockTopicSelect' : 'aptTopicSelect'}`);
    
    if (this.startBtn) this.startBtn.addEventListener('click', () => this.startTest());
    if (this.retestBtn) this.retestBtn.addEventListener('click', () => this.resetUI());
    
    this.fetchLatestResult();
  }

  async fetchLatestResult() {
    try {
      const res = await authFetch(`${API_BASE}/test/${this.type}/latest`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.result) {
        this.fillResult(data.result);
      }
    } catch (e) {
      console.error(`Failed to fetch latest ${this.type} result:`, e);
    }
  }

  async startTest() {
    if (!this.topicSelect) return;
    const topicVal = this.topicSelect.value;
    
    // --- Survey validation: check if user has completed Career Assist ---
    try {
      const surveyRes = await authFetch(`${API_BASE}/survey/last`);
      if (surveyRes.ok) {
        const surveyData = await surveyRes.json();
        // If survey is null or missing chosenRole, block test
        const hasRole = surveyData && (surveyData.chosenRole || (surveyData.answers && surveyData.answers.chosenRole));
        if (!hasRole) {
          this.qWrap.innerHTML = `
            <div class="text-center py-6">
              <div class="w-16 h-16 bg-[#F8EDEB] rounded-full flex items-center justify-center mx-auto mb-4 text-[#98422f] text-3xl"><i class="fas fa-lock"></i></div>
              <h3 class="text-lg font-bold text-[#653b2e] mb-2">Career Assessment Required</h3>
              <p class="text-sm text-[#803c2c] mb-4">Please complete your Career Assessment first to unlock personalized tests.</p>
              <a href="career-assist.html" class="inline-block px-6 py-2 rounded-xl bg-[#bc7e6a] hover:bg-[#d3ab9e] text-white font-semibold shadow transition">Go To Career Assist</a>
            </div>
          `;
          return;
        }
        // For Skill Gap test, also require skill_gap data
        if (this.type === 'mock' && topicVal === 'skillgap') {
          const hasSkillGap = surveyData.skill_gap && surveyData.skill_gap.skillsToLearn && surveyData.skill_gap.skillsToLearn.length > 0;
          if (!hasSkillGap) {
            this.qWrap.innerHTML = `
              <div class="text-center py-6">
                <div class="w-16 h-16 bg-[#F8EDEB] rounded-full flex items-center justify-center mx-auto mb-4 text-[#98422f] text-3xl"><i class="fas fa-exclamation-triangle"></i></div>
                <h3 class="text-lg font-bold text-[#653b2e] mb-2">Skill Gap Data Missing</h3>
                <p class="text-sm text-[#803c2c] mb-4">Complete your Career Assessment and generate a Roadmap to unlock the Skill Gap Test.</p>
                <a href="career-assist.html" class="inline-block px-6 py-2 rounded-xl bg-[#bc7e6a] hover:bg-[#d3ab9e] text-white font-semibold shadow transition">Go To Career Assist</a>
              </div>
            `;
            return;
          }
        }
      } else {
        // Survey endpoint failed — block as a safety measure
        this.qWrap.innerHTML = `
          <div class="text-center py-6">
            <div class="w-16 h-16 bg-[#F8EDEB] rounded-full flex items-center justify-center mx-auto mb-4 text-[#98422f] text-3xl"><i class="fas fa-lock"></i></div>
            <h3 class="text-lg font-bold text-[#653b2e] mb-2">Career Assessment Required</h3>
            <p class="text-sm text-[#803c2c] mb-4">Please complete your Career Assessment first to unlock personalized tests.</p>
            <a href="career-assist.html" class="inline-block px-6 py-2 rounded-xl bg-[#bc7e6a] hover:bg-[#d3ab9e] text-white font-semibold shadow transition">Go To Career Assist</a>
          </div>
        `;
        return;
      }
    } catch (e) {
      console.warn('Survey check failed:', e);
    }
    
    this.loader.classList.remove('hidden');
    this.qWrap.innerHTML = '';
    
    try {
      const payload = this.type === 'mock' ? { testType: topicVal } : { category: topicVal };
      const res = await authFetch(`${API_BASE}/test/${this.type}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      this.loader.classList.add('hidden');
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        this.qWrap.innerHTML = `<div class="text-red-500">${errData.error || 'Failed to start test. Please try again.'}</div>`;
        return;
      }
      
      const data = await res.json();
      if (data && data.sessionId) {
        this.sessionId = data.sessionId;
        this.questions = data.questions;
        this.answers = [];
        this.currentIndex = 0;
        this.renderCurrentQuestion();
      } else {
        this.qWrap.innerHTML = '<div class="text-red-500">Failed to start test. Please try again.</div>';
      }
    } catch (e) {
      this.loader.classList.add('hidden');
      this.qWrap.innerHTML = `<div class="text-red-500">Error: ${e.message}</div>`;
    }
  }

  renderCurrentQuestion() {
    if (!this.questions || this.questions.length === 0) return;
    
    const q = this.questions[this.currentIndex];
    const savedAns = this.answers.find(a => a.questionId === q.id)?.answer || "";
    
    let inputHtml = '';
    if (q.type === 'mcq') {
      inputHtml = q.options.map((opt, idx) => `
        <label class="flex items-center gap-2 mb-2 p-2 border border-[#f3e8e3] rounded-lg cursor-pointer hover:bg-[#fffbff]">
          <input type="radio" name="q${q.id}" value="${idx}" ${savedAns === String(idx) ? 'checked' : ''} class="w-4 h-4 text-[#bc7e6a] focus:ring-[#bc7e6a]">
          <span>${opt}</span>
        </label>
      `).join('');
    } else {
      inputHtml = `<textarea id="q${q.id}_text" class="w-full p-3 border border-[#f3e8e3] rounded-lg outline-none focus:border-[#bc7e6a]" rows="4" placeholder="Type your answer here...">${savedAns}</textarea>`;
    }
    
    this.qWrap.innerHTML = `
      <div class="mb-4">
        <div class="flex justify-between items-center mb-3">
          <span class="font-bold text-[#653b2e] text-lg">Question ${this.currentIndex + 1} of ${this.questions.length}</span>
          <span class="text-xs px-2 py-1 bg-[#F8EDEB] text-[#98422f] rounded-full uppercase tracking-wider font-semibold">${q.type === 'mcq' ? 'Multiple Choice' : 'Descriptive'}</span>
        </div>
        <p class="mb-4 font-medium text-base text-[#2b2421]">${q.question}</p>
        <div class="mb-4">
          ${inputHtml}
        </div>
        <div id="${this.prefix}Error" class="hidden text-red-500 text-sm mb-3">Please provide an answer before proceeding.</div>
        <div class="flex justify-between mt-6 pt-4 border-t border-[#f3e8e3]">
          <button id="${this.prefix}PrevBtn" class="px-4 py-2 rounded-lg bg-[#f3e8e3] hover:bg-[#edddd8] text-[#653b2e] font-medium transition ${this.currentIndex === 0 ? 'invisible' : ''}">Previous</button>
          <button id="${this.prefix}NextBtn" class="px-4 py-2 rounded-lg bg-[#bc7e6a] hover:bg-[#d3ab9e] text-white font-medium transition">${this.currentIndex === this.questions.length - 1 ? 'Submit Test' : 'Next'}</button>
        </div>
      </div>
    `;
    
    document.getElementById(`${this.prefix}PrevBtn`).addEventListener('click', () => this.handlePrev());
    document.getElementById(`${this.prefix}NextBtn`).addEventListener('click', () => this.handleNext());
  }

  async saveCurrentAnswer() {
    const q = this.questions[this.currentIndex];
    let ans = "";
    if (q.type === 'mcq') {
      const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
      if (selected) ans = selected.value;
    } else {
      const ta = document.getElementById(`q${q.id}_text`);
      if (ta) ans = ta.value.trim();
    }
    
    if (!ans) {
      document.getElementById(`${this.prefix}Error`).classList.remove('hidden');
      return false;
    }
    document.getElementById(`${this.prefix}Error`).classList.add('hidden');
    
    const existingIdx = this.answers.findIndex(a => a.questionId === q.id);
    if (existingIdx >= 0) {
      this.answers[existingIdx].answer = ans;
    } else {
      this.answers.push({ questionId: q.id, answer: ans });
    }
    
    // Save to server asynchronously for resilience
    authFetch(`${API_BASE}/test/session/${this.sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: q.id, answer: ans })
    }).catch(e => console.warn("Failed to sync answer:", e));
    
    return true;
  }

  async handlePrev() {
    await this.saveCurrentAnswer();
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderCurrentQuestion();
    }
  }

  async handleNext() {
    const isValid = await this.saveCurrentAnswer();
    if (!isValid) return;
    
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.renderCurrentQuestion();
    } else {
      await this.submitTest();
    }
  }

  async submitTest() {
    this.qWrap.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 text-center">
        <i class="fas fa-spinner fa-spin text-4xl text-[#bc7e6a] mb-4"></i>
        <h3 class="text-lg font-bold text-[#653b2e]">Evaluating your answers...</h3>
        <p class="text-sm text-[#803c2c] mt-2">AI is analyzing your descriptive responses.</p>
      </div>
    `;
    
    try {
      const res = await authFetch(`${API_BASE}/test/${this.type}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId })
      });
      
      if (!res.ok) {
        this.qWrap.innerHTML = '<div class="text-red-500">Failed to submit test.</div>';
        return;
      }
      
      const data = await res.json();
      if (data && data.success) {
        this.fetchLatestResult(); // Reload the UI with new stats
        this.qWrap.innerHTML = `
          <div class="text-center py-6">
            <div class="w-16 h-16 bg-[#eac9c1] rounded-full flex items-center justify-center mx-auto mb-4 text-[#98422f] text-2xl"><i class="fas fa-check"></i></div>
            <h3 class="text-xl font-bold text-[#653b2e] mb-2">Test Submitted Successfully!</h3>
            <p class="text-md font-medium">Score: ${data.score} / 10</p>
            <p class="text-sm text-[#803c2c] mt-1">Check your dashboard for points!</p>
          </div>
        `;
      } else {
        this.qWrap.innerHTML = '<div class="text-red-500">Failed to submit test.</div>';
      }
    } catch (e) {
      this.qWrap.innerHTML = `<div class="text-red-500">Error: ${e.message}</div>`;
    }
  }

  fillResult(r) {
    // Fill result spans
    const basePrefix = this.prefix.startsWith('mock') ? 'mock' : 'apt';
    const isSm = this.prefix.endsWith('Sm');
    const displayPrefix = basePrefix + (isSm ? 'Sm' : '');
    
    const map = {
      Topic: r.topic,
      Score: `${r.totalScore} / 10`,
      Total: "10",
      Correct: r.mcqCorrect + " (MCQ)",
      Wrong: r.mcqWrong + " (MCQ)",
    };
    Object.entries(map).forEach(([k, v]) => {
      const id = `${displayPrefix}Res${k}`;
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    });
  }

  resetUI() {
    this.qWrap.innerHTML = `
      <div class="rounded-lg border border-[#f3e8e3] bg-[#fffbff] px-3 py-2">
        Your questions will be displayed here. Select a topic and click START to begin a new test.
      </div>
    `;
    this.sessionId = null;
    this.questions = [];
    this.answers = [];
    this.currentIndex = 0;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TestEngine('mock', 'mock');
  new TestEngine('mock', 'mockSm');
  new TestEngine('aptitude', 'apt');
  new TestEngine('aptitude', 'aptSm');
});

// ---------- AI INTERVIEWER MODE ----------

(function aiInit() {
  const startBtn = document.getElementById('startInterview');
  const videoEl = document.getElementById('video');
  const overlay = document.getElementById('aiOverlay');
  const btnEnd = document.getElementById('btnEnd');
  const btnCam = document.getElementById('btnCam');
  const btnMic = document.getElementById('btnMic');
  const overallScore = document.getElementById('overallScore');
  const aiSuggestions = document.getElementById('aiSuggestions');
  
  const aiAvatarContainer = document.getElementById('aiAvatarContainer');
  const aiSpeakingIndicator = document.getElementById('aiSpeakingIndicator');
  const liveSubtitlesPanel = document.getElementById('liveSubtitlesPanel');
  const subtitleScrollArea = document.getElementById('subtitleScrollArea');
  const interviewControls = document.getElementById('interviewControls');
  const interviewRoleSpan = document.getElementById('interviewRoleSpan');
  const questionCounter = document.getElementById('questionCounter');
  let stream = null;
  let sessionId = null;
  let currentQuestionIndex = 0;
  let isInterviewActive = false;
  let isAIProcessing = false;
  let faceMeshResults = [];
  
  // Inject style to hide scrollbar for premium subtitle experience
  if (!document.getElementById('aiSubtitleStyle')) {
      const style = document.createElement('style');
      style.id = 'aiSubtitleStyle';
      style.innerHTML = `
          #subtitleScrollArea::-webkit-scrollbar { display: none; }
          #subtitleScrollArea { -ms-overflow-style: none; scrollbar-width: none; overflow-y: auto; }
      `;
      document.head.appendChild(style);
  }
  
  let isMicEnabled = true;
  let isCamEnabled = true;
  let silenceTimer = null;
  const SILENCE_TIMEOUT_MS = 10000;
  let currentAnswerTranscript = "";
  let userSubtitleDiv = null;

  let mediaRecorder = null;
  let audioChunks = [];
  let audioContext = null;
  let analyser = null;
  let microphone = null;
  let vadInterval = null;
  let isRecording = false;
  let audioOnlyStream = null;

  // FaceMesh singleton state — initialized at most ONCE per page load
  let faceMeshInitialized = false;
  let faceMeshInstance = null;
  let faceMeshCamera = null;
  let faceMeshAvailable = false;

  let synth = window.speechSynthesis;

  // ═══════════════════════════════════════════════════════════
  // SINGLE INTERVIEW ENVIRONMENT INITIALIZER
  // All flows (new interview, resume, start-new-after-abandon)
  // call this ONE function to start camera + FaceMesh + audio.
  // ═══════════════════════════════════════════════════════════
  async function initializeInterviewEnvironment() {
      // 1. Get camera + mic permissions
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoEl) videoEl.srcObject = stream;

      // 2. Initialize FaceMesh (optional, singleton, non-blocking)
      initializeFaceMesh();

      // 3. Reset UI controls
      isMicEnabled = true;
      btnMic.classList.remove('bg-red-500', 'hover:bg-red-600');
      btnMic.classList.add('bg-white/20', 'hover:bg-white/40');
      btnMic.innerHTML = '<i class="fas fa-microphone"></i>';
      
      isCamEnabled = true;
      btnCam.classList.remove('bg-red-500', 'hover:bg-red-600');
      btnCam.classList.add('bg-white/20', 'hover:bg-white/40');
      btnCam.innerHTML = '<i class="fas fa-video"></i>';
      if (videoEl) videoEl.style.opacity = '1';
      const disabledOverlay = document.getElementById('cameraDisabledOverlay');
      if (disabledOverlay) disabledOverlay.classList.add('hidden');

      // 4. Show interview panels
      if (overlay) overlay.classList.add('hidden');
      if (liveSubtitlesPanel) liveSubtitlesPanel.classList.remove('hidden');
      if (interviewControls) interviewControls.classList.remove('hidden');
      if (subtitleScrollArea) subtitleScrollArea.innerHTML = '';
  }

  // ═══════════════════════════════════════════════════════════
  // FACEMESH SINGLETON — Initializes at most ONCE per page load.
  // If it fails, interview continues without face tracking.
  // ═══════════════════════════════════════════════════════════
  function initializeFaceMesh() {
      if (faceMeshInitialized) {
          // If FaceMesh is already initialized but the camera was stopped during a previous endCall,
          // we just need to restart the camera feed, not recreate the WASM instance.
          if (faceMeshInstance && !faceMeshCamera && window.Camera && videoEl) {
              faceMeshCamera = new window.Camera(videoEl, {
                  onFrame: async () => {
                      if (isInterviewActive && faceMeshInstance && isCamEnabled) {
                          try { await faceMeshInstance.send({ image: videoEl }); } catch(e) {}
                      }
                  },
                  onError: (e) => console.warn('FaceMesh Camera error (non-fatal):', e),
                  width: 320, height: 240
              });
              try { faceMeshCamera.start(); } catch(e) { console.warn('FaceMesh Camera restart failed:', e); }
          }
          return;
      }
      
      faceMeshInitialized = true; // Mark as attempted — never retry

      try {
          if (!window.FaceMesh) {
              console.warn('FaceMesh SDK not loaded — confidence tracking disabled');
              return;
          }
          if (!videoEl) {
              console.warn('Video element not found — FaceMesh disabled');
              return;
          }

          faceMeshInstance = new window.FaceMesh({
              locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
          });
          faceMeshInstance.setOptions({
              maxNumFaces: 1,
              refineLandmarks: true,
              minDetectionConfidence: 0.5,
              minTrackingConfidence: 0.5
          });
          faceMeshInstance.onResults((results) => {
              faceMeshResults = results.multiFaceLandmarks;
              faceMeshAvailable = true;
          });

          if (window.Camera && videoEl) {
              faceMeshCamera = new window.Camera(videoEl, {
                  onFrame: async () => {
                      if (isInterviewActive && faceMeshInstance && isCamEnabled) {
                          try { await faceMeshInstance.send({ image: videoEl }); } catch(e) {}
                      }
                  },
                  onError: (e) => {
                      console.warn('FaceMesh Camera error (non-fatal):', e);
                  },
                  width: 320,
                  height: 240
              });
              try { faceMeshCamera.start(); } catch(e) {
                  console.warn('FaceMesh Camera.start() failed (non-fatal):', e);
              }
          }
      } catch (err) {
          console.warn('FaceMesh init failed (non-fatal) — interview continues without face tracking:', err.message);
          faceMeshInstance = null;
          faceMeshCamera = null;
      }
  }

  function cleanupFaceMesh() {
      // ONLY stop the camera feed. 
      // DO NOT close faceMeshInstance or reset faceMeshInitialized.
      // MediaPipe WASM instances crash if recreated multiple times on the same page.
      // By keeping the instance alive, we make it a true singleton that safely handles retakes.
      if (faceMeshCamera) { try { faceMeshCamera.stop(); } catch(e) {} faceMeshCamera = null; }
      faceMeshAvailable = false;
  }

  function getFaceConfidenceScore() {
      if (!faceMeshAvailable || !faceMeshResults || faceMeshResults.length === 0) return 3.0;
      return 4.5;
  }

  // ═══════════════════════════════════════════════════════════
  // BROWSER REFRESH RECOVERY
  // On page load, check for in-progress sessions BEFORE
  // starting any hardware. Show modal first, let user decide.
  // ═══════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', async () => {
      try {
          const res = await authFetch(`${API_BASE}/interview/resume`);
          if (res.ok) {
              const data = await res.json();
              if (data && data.success && data.resumeAvailable && data.sessionId) {
                  console.log("Resume response:", data);
                  console.log("Opening resume modal (Auto-recovery)");
                  showResumeModal(data);
              }
          }
      } catch (e) { /* No in-progress interview — silent */ }
  });
  
  function showResumeModal(resumeData) {
      // Remove any existing modal first
      const existing = document.getElementById('resumeModal');
      if (existing) existing.remove();

      const modalHtml = `
          <div id="resumeModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div class="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-lg">
                  <div class="w-16 h-16 bg-[#eac9c1] rounded-full flex items-center justify-center mx-auto mb-4 text-[#98422f] text-3xl"><i class="fas fa-history"></i></div>
                  <h3 class="text-xl font-bold text-[#653b2e] text-center mb-2">Resume Previous Interview?</h3>
                  <p class="text-sm text-[#803c2c] text-center mb-6">You left your interview for ${resumeData.role} at Question ${resumeData.currentQuestion}/10. Would you like to continue where you left off?</p>
                  <div class="flex justify-center gap-4">
                      <button id="btnStartNew" class="px-5 py-2 border-2 border-[#bc7e6a] text-[#bc7e6a] rounded-lg hover:bg-[#F8EDEB] font-medium transition">Start New Interview</button>
                      <button id="btnResume" class="px-5 py-2 bg-[#bc7e6a] text-white rounded-lg hover:bg-[#d3ab9e] font-medium shadow transition">Resume Interview</button>
                  </div>
              </div>
          </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);

      // Start New: abandon old session, then start fresh
      document.getElementById('btnStartNew').onclick = async () => {
          document.getElementById('resumeModal').remove();
          try {
              await authFetch(`${API_BASE}/interview/abandon`, { method: 'POST' });
          } catch(e) { console.warn('Abandon failed', e); }
          startNewInterview();
      };

      // Resume: restore session state, then init environment
      document.getElementById('btnResume').onclick = () => {
          document.getElementById('resumeModal').remove();
          startResumeFlow(resumeData);
      };
  }
  
  // ═══════════════════════════════════════════════════════════
  // RESUME FLOW — Restores previous session, THEN starts hw
  // ═══════════════════════════════════════════════════════════
  async function startResumeFlow(data) {
      if (startBtn) startBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Restoring Interview...';
      try {
          // Initialize hardware FIRST
          await initializeInterviewEnvironment();

          // Restore session state
          sessionId = data.sessionId;
          currentQuestionIndex = data.currentQuestion;
          if (interviewRoleSpan) interviewRoleSpan.textContent = data.role;
          isInterviewActive = true;
          updateQuestionCounter();

          // Restore previous conversation
          if (data.transcripts) {
              data.transcripts.forEach(t => {
                  const parts = t.split('\nA: ');
                  const q = parts[0].replace('Q: ', '');
                  const a = parts[1] || '(No response provided)';
                  appendSubtitle('ai', q);
                  appendSubtitle('user', a);
              });
          }
          
          if (data.scores && data.scores.length > 0) {
              const lastScore = data.scores[data.scores.length - 1];
              updateStars('confStars', lastScore.faceConfidence || 3);
              updateStars('clarStars', lastScore.clarity || 3);
          }
          
          // Continue from where they left off
          if (currentQuestionIndex < 10) {
              const nextQ = data.questions[currentQuestionIndex];
              speakAndListen(nextQ);
          } else {
              finishInterview();
          }
      } catch (err) {
          console.error(err);
          alert('Could not resume interview. Check camera/mic permissions.');
          if (startBtn) startBtn.innerHTML = '<i class="fas fa-play mr-2"></i> START YOUR INTERVIEW';
      }
  }

  // ═══════════════════════════════════════════════════════════
  // NEW INTERVIEW FLOW — Creates session, THEN starts hw
  // ═══════════════════════════════════════════════════════════
  async function startNewInterview() {
      if (startBtn) startBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Connecting to AI Interviewer...';
      try {
          await new Promise(r => setTimeout(r, 1500)); // Brief premium delay

          // 1. Check for resume sessions FIRST (no hardware started yet)
          const resumeRes = await authFetch(`${API_BASE}/interview/resume`);
          const resumeData = resumeRes.ok ? await resumeRes.json() : null;
          
          if (resumeData && resumeData.resumeAvailable && resumeData.sessionId) {
              if (startBtn) startBtn.innerHTML = '<i class="fas fa-play mr-2"></i> START YOUR INTERVIEW';
              console.log("Resume response:", resumeData);
              console.log("Opening resume modal");
              showResumeModal(resumeData);
              return;
          }

          // 2. No resume needed — create fresh session and initialize hardware
          const startRes = await authFetch(`${API_BASE}/interview/start?force=true`, { method: 'POST' });
          if (!startRes.ok) throw new Error("Failed to start session");
          const data = await startRes.json();

          await initializeInterviewEnvironment();

          // 3. Set session state
          sessionId = data.sessionId;
          if (interviewRoleSpan) interviewRoleSpan.textContent = data.role;
          currentQuestionIndex = 0;
          isInterviewActive = true;
          updateQuestionCounter();

          // 4. Speak first question
          speakAndListen(data.question);

      } catch (err) {
          console.error(err);
          alert('Could not start interview. Check camera/mic permissions and backend connection.');
          if (startBtn) startBtn.innerHTML = '<i class="fas fa-play mr-2"></i> START YOUR INTERVIEW';
      }
  }

  // ═══════════════════════════════════════════════════════════
  // START BUTTON — Survey gate, then delegates to startNewInterview
  // ═══════════════════════════════════════════════════════════
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      // Survey gate check (no hardware started)
      try {
        const surveyRes = await authFetch(`${API_BASE}/survey/last`);
        if (surveyRes.ok) {
          const surveyData = await surveyRes.json();
          const hasRole = surveyData && (surveyData.chosenRole || (surveyData.answers && surveyData.answers.chosenRole));
          if (!hasRole) {
            overlay.innerHTML = `
              <div class="text-center py-6">
                <div class="w-16 h-16 bg-[#F8EDEB] rounded-full flex items-center justify-center mx-auto mb-4 text-[#98422f] text-3xl"><i class="fas fa-lock"></i></div>
                <h3 class="text-lg font-bold text-white mb-2">Career Assessment Required</h3>
                <p class="text-sm text-gray-300 mb-4">Please complete your Career Assessment first to unlock personalized AI Interviews.</p>
                <a href="career-assist.html" class="inline-block px-6 py-2 rounded-xl bg-[#bc7e6a] hover:bg-[#d3ab9e] text-white font-semibold shadow transition">Go To Career Assist</a>
              </div>
            `;
            return;
          }
        }
      } catch (e) { console.warn('Survey check failed', e); }

      // Delegate to the new interview flow
      startNewInterview();
    });
  }

  function updateQuestionCounter() {
    if (questionCounter) questionCounter.textContent = `Question ${currentQuestionIndex + 1}/10`;
  }

  function appendSubtitle(role, text) {
      const div = document.createElement('div');
      div.className = `transition-opacity duration-500 opacity-0 p-3 rounded-lg mb-3 shadow-sm ${role === 'ai' ? 'text-gray-100 bg-[#2a2a35] border border-gray-600/50' : 'text-blue-100 ml-6 bg-[#1a233a] border border-blue-800/50'}`;
      div.innerHTML = `<span class="font-bold uppercase opacity-60 text-xs block mb-1 tracking-wider">${role === 'ai' ? 'AI Interviewer' : 'You'}</span><span class="leading-relaxed text-sm">${text}</span>`;
      subtitleScrollArea.appendChild(div);
      
      requestAnimationFrame(() => {
          div.classList.remove('opacity-0');
          div.classList.add('opacity-100');
      });

      cleanupSubtitles();
      return div;
  }

  function cleanupSubtitles() {
      const allDivs = Array.from(subtitleScrollArea.children).filter(el => el.id !== 'listeningIndicator');
      if (allDivs.length > 5) {
          const excess = allDivs.length - 5;
          for (let i = 0; i < excess; i++) {
              const oldDiv = allDivs[i];
              if (!oldDiv.dataset.fading) {
                  oldDiv.dataset.fading = 'true';
                  oldDiv.classList.remove('opacity-100');
                  oldDiv.classList.add('opacity-0');
                  setTimeout(() => {
                      if (oldDiv.parentNode) oldDiv.remove();
                  }, 500);
              }
          }
      }
      subtitleScrollArea.scrollTo({ top: subtitleScrollArea.scrollHeight, behavior: 'smooth' });
  }

  function speakAndListen(questionText) {
    if (!isInterviewActive) return;
    
    isAIProcessing = true; // Lock mic immediately
    synth.cancel(); // Safety: stop any ongoing AI speech
    
    appendSubtitle('ai', questionText);
    
    const utterance = new SpeechSynthesisUtterance(questionText);
    utterance.rate = 1.0;
    
    const voices = synth.getVoices();
    const femaleVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Google UK English Female')));
    if (femaleVoice) utterance.voice = femaleVoice;

    utterance.onstart = () => {
        isAIProcessing = true;
        aiAvatarContainer.classList.remove('avatar-idle');
        aiAvatarContainer.classList.add('avatar-speaking');
        aiSpeakingIndicator.classList.remove('hidden');
    };
    
    utterance.onend = () => {
        aiAvatarContainer.classList.remove('avatar-speaking');
        aiAvatarContainer.classList.add('avatar-idle');
        aiSpeakingIndicator.classList.add('hidden');
        
        isAIProcessing = false;
        // Start listening after speaking
        setTimeout(() => startListening(), 500);
    };

    synth.speak(utterance);
  }

  function resetSilenceTimer() {
      clearTimeout(silenceTimer);
      if (!isInterviewActive || !isRecording) return;
      
      silenceTimer = setTimeout(() => {
          if (isInterviewActive && isRecording) {
              mediaRecorder.stop();
          }
      }, SILENCE_TIMEOUT_MS);
  }

  function startListening() {
      if (!isInterviewActive || !isMicEnabled || isAIProcessing) return;
      if (!stream) {
          console.error('startListening: No stream available');
          return;
      }

      // Create audio-only stream for MediaRecorder (avoids video track conflicts)
      if (!audioOnlyStream) {
          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length === 0) {
              console.error('startListening: No audio tracks in stream');
              return;
          }
          audioOnlyStream = new MediaStream(audioTracks);
      }

      // Initialize AudioContext + AnalyserNode for VAD
      if (!audioContext) {
          try {
              audioContext = new (window.AudioContext || window.webkitAudioContext)();
              analyser = audioContext.createAnalyser();
              analyser.fftSize = 512;
              analyser.smoothingTimeConstant = 0.1;
              microphone = audioContext.createMediaStreamSource(audioOnlyStream);
              microphone.connect(analyser);
          } catch(e) {
              console.error('Audio VAD init failed', e);
          }
      }

      // Pick best supported audio container
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
          if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
          else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
          else mimeType = ''; // let browser pick default
      }
      const recorderOpts = mimeType ? { mimeType } : undefined;

      try {
          mediaRecorder = new MediaRecorder(audioOnlyStream, recorderOpts);
      } catch (e) {
          console.error('MediaRecorder creation failed:', e);
          return;
      }

      audioChunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
      };
      
      mediaRecorder.onstart = () => {
          isRecording = true;
          const ind = document.getElementById('listeningIndicator');
          if (!ind) {
              const div = document.createElement('div');
              div.id = 'listeningIndicator';
              div.className = 'text-green-400 text-xs italic animate-pulse mt-2';
              div.textContent = '🎤 Listening...';
              subtitleScrollArea.appendChild(div);
          }
          if (audioContext && audioContext.state === 'suspended') {
              audioContext.resume();
          }
          monitorVAD();
      };

      mediaRecorder.onstop = () => {
          isRecording = false;
          clearInterval(vadInterval);
          vadInterval = null;
          clearTimeout(silenceTimer);
          const ind = document.getElementById('listeningIndicator');
          if (ind) ind.remove();

          if (audioChunks.length === 0) {
              submitUserAnswer('(No response provided)');
              return;
          }

          const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
          processAudio(audioBlob);
      };

      mediaRecorder.onerror = (e) => {
          console.error('MediaRecorder error:', e);
          isRecording = false;
      };

      try {
          mediaRecorder.start(250);
      } catch (e) {
          console.error('MediaRecorder.start() failed:', e);
      }
  }

  function monitorVAD() {
      if (!analyser) {
          // No VAD — fall back to pure silence timer
          resetSilenceTimer();
          return;
      }
      if (vadInterval) clearInterval(vadInterval);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceStart = Date.now();
      let hasSpoken = false;

      vadInterval = setInterval(() => {
          if (!isInterviewActive || !isRecording) {
              clearInterval(vadInterval);
              vadInterval = null;
              return;
          }
          
          try {
              analyser.getByteFrequencyData(dataArray);
          } catch(e) {
              clearInterval(vadInterval);
              vadInterval = null;
              return;
          }
          
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) { sum += dataArray[i]; }
          const average = sum / dataArray.length;

          if (average > 15) {
              silenceStart = Date.now();
              if (!hasSpoken) hasSpoken = true;
          } else {
              const elapsed = Date.now() - silenceStart;
              if (hasSpoken && elapsed > 3000) {
                  // User spoke and has been silent for 3 seconds — submit
                  clearInterval(vadInterval);
                  vadInterval = null;
                  if (mediaRecorder && mediaRecorder.state === 'recording') {
                      mediaRecorder.stop();
                  }
              } else if (!hasSpoken && elapsed > SILENCE_TIMEOUT_MS) {
                  // User never spoke — timeout
                  clearInterval(vadInterval);
                  vadInterval = null;
                  if (mediaRecorder && mediaRecorder.state === 'recording') {
                      mediaRecorder.stop();
                  }
              }
          }
      }, 100);
  }

  async function processAudio(audioBlob) {
      if (!isInterviewActive || isAIProcessing) return;
      isAIProcessing = true;
      
      appendSubtitle('system', '<i class="fas fa-spinner fa-spin mr-2"></i> Processing Your Answer... Please wait while we analyze your response.');
      disableControls();

      const formData = new FormData();
      formData.append('audio', audioBlob, 'interview-answer.webm');

      try {
          const res = await authFetch(`${API_BASE}/interview/transcribe`, {
              method: 'POST',
              body: formData
          });

          const data = await res.json();
          if (!res.ok) throw new Error("Transcription failed");

          const transcript = data.text || "";
          
          // Remove system loading message
          const sysMsgs = subtitleScrollArea.querySelectorAll('div');
          sysMsgs.forEach(msg => {
              if(msg.innerHTML.includes('Processing Your Answer')) msg.remove();
          });

          if (!transcript || transcript.trim().length < 15 || transcript.toLowerCase().includes("thank you")) {
              showTranscriptModal(transcript, (finalTranscript) => {
                  submitUserAnswer(finalTranscript);
              });
          } else {
              submitUserAnswer(transcript);
          }
      } catch(e) {
          console.error("Transcribe error", e);
          const sysMsgs = subtitleScrollArea.querySelectorAll('div');
          sysMsgs.forEach(msg => {
              if(msg.innerHTML.includes('Processing Your Answer')) msg.remove();
          });
          appendSubtitle('system', 'Failed to transcribe audio. Please try again.');
          isAIProcessing = false;
          enableControls();
          startListening();
      }
  }

  function disableControls() {
      btnMic.disabled = true;
      btnMic.style.opacity = '0.5';
      btnCam.disabled = true;
      btnCam.style.opacity = '0.5';
      btnEnd.disabled = true;
      btnEnd.style.opacity = '0.5';
  }

  function enableControls() {
      btnMic.disabled = false;
      btnMic.style.opacity = '1';
      btnCam.disabled = false;
      btnCam.style.opacity = '1';
      btnEnd.disabled = false;
      btnEnd.style.opacity = '1';
  }

  function showTranscriptModal(transcript, callback) {
      const modalHtml = `
          <div id="transcriptModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div class="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-lg">
                  <h3 class="text-xl font-bold text-gray-800 mb-2">Verify Your Answer</h3>
                  <p class="text-sm text-gray-500 mb-4">We noticed your transcript was quite short or unclear. Please edit or confirm your answer before we submit it to the AI.</p>
                  <textarea id="transcriptEditor" class="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4">${transcript}</textarea>
                  <div class="flex justify-end gap-3">
                      <button id="btnConfirmTranscript" class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Confirm Answer</button>
                  </div>
              </div>
          </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      const modal = document.getElementById('transcriptModal');
      const btn = document.getElementById('btnConfirmTranscript');
      const editor = document.getElementById('transcriptEditor');
      
      btn.onclick = () => {
          const finalVal = editor.value.trim();
          modal.remove();
          callback(finalVal);
      };
  }

  async function submitUserAnswer(transcript) {
      if (!isInterviewActive) return;
      isAIProcessing = true;
      disableControls();

      const cleanedTranscript = cleanTranscript(transcript);

      appendSubtitle('user', cleanedTranscript || '(No response provided)');

      const confScore = getFaceConfidenceScore();

      try {
          const res = await authFetch(`${API_BASE}/interview/answer`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  sessionId,
                  answerText: cleanedTranscript,
                  currentQuestionIndex,
                  faceConfidence: confScore
              })
          });

          const data = await res.json();
          if (!res.ok) throw new Error("Failed to submit answer");

          if (data.evaluation) {
              updateStars('confStars', confScore);
              updateStars('clarStars', data.evaluation.clarity || 3);
          }

          currentQuestionIndex++;
          if (currentQuestionIndex < 10 && data.nextQuestion) {
              updateQuestionCounter();
              enableControls();
              speakAndListen(data.nextQuestion);
          } else {
              finishInterview();
          }

      } catch (err) {
          console.error("Error submitting answer:", err);
          appendSubtitle('system', 'Network error. Ending interview.');
          endCall();
      }
  }

  async function finishInterview() {
      isInterviewActive = false;
      clearTimeout(silenceTimer);
      synth.cancel();

      // Stop recording pipeline
      if (mediaRecorder && isRecording) {
          mediaRecorder.onstop = null;
          try { mediaRecorder.stop(); } catch(e){}
      }
      if (vadInterval) { clearInterval(vadInterval); vadInterval = null; }
      if (audioContext) { try { audioContext.close(); } catch(e){} audioContext = null; analyser = null; microphone = null; }
      audioOnlyStream = null;

      if (stream) {
          stream.getTracks().forEach(t => { t.stop(); t.enabled = false; });
          stream = null;
      }
      if (videoEl) videoEl.srcObject = null;
      cleanupFaceMesh();

      if (overallScore) overallScore.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      try {
          const res = await authFetch(`${API_BASE}/interview/complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: sessionId, avgFaceConfidence: 4.0 })
          });
          const data = await res.json();
          if (res.ok) {
              if (overallScore) overallScore.textContent = `${(data.overallScore || 0).toFixed(1)} / 5.0`;
              if (aiSuggestions && data.suggestions) {
                  aiSuggestions.innerHTML = data.suggestions.map(s => `<li class="px-3 py-2 rounded-lg bg-[#fffbff] border border-[#f3e8e3] text-black shadow-sm">${s}</li>`).join('');
              }
          }
      } catch (err) {
          console.error(err);
          if (overallScore) overallScore.textContent = 'Error';
      }

      // Set the popup pending flag so it appears when they navigate to dashboard
      localStorage.setItem('interview_completed_popup_pending', 'true');

      // endCall handles UI reset (overlay, buttons, etc.)
      // Media tracks already stopped above, so endCall will gracefully skip them.
      endCall();
  }

  function updateStars(containerId, score) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';
      const rounded = Math.round(score);
      for (let i = 1; i <= 5; i++) {
          container.innerHTML += `<span class="transition-transform ${i <= rounded ? '' : 'opacity-40'}">⭐</span>`;
      }
  }
  
  function updateMicUI() {
      if (isMicEnabled) {
          btnMic.classList.remove('bg-red-500', 'hover:bg-red-600');
          btnMic.classList.add('bg-white/20', 'hover:bg-white/40');
          btnMic.innerHTML = '<i class="fas fa-microphone"></i>';
      } else {
          btnMic.classList.add('bg-red-500', 'hover:bg-red-600');
          btnMic.classList.remove('bg-white/20', 'hover:bg-white/40');
          btnMic.innerHTML = '<i class="fas fa-microphone-slash"></i>';
      }
  }

  function toggleAudio() {
      if (!stream) return;
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;
      
      isMicEnabled = !isMicEnabled;
      audioTracks[0].enabled = isMicEnabled;
      
      updateMicUI();
      
      if (isMicEnabled && isInterviewActive && !isRecording && !isAIProcessing) {
          startListening();
      } else if (!isMicEnabled && isRecording) {
          mediaRecorder.stop();
      }
  }

  function toggleVideo() {
      if (!stream) return;
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) return;
      
      isCamEnabled = !isCamEnabled;
      videoTracks[0].enabled = isCamEnabled;
      
      const disabledOverlay = document.getElementById('cameraDisabledOverlay');
      if (isCamEnabled) {
          btnCam.classList.remove('bg-red-500', 'hover:bg-red-600');
          btnCam.classList.add('bg-white/20', 'hover:bg-white/40');
          btnCam.innerHTML = '<i class="fas fa-video"></i>';
          videoEl.style.opacity = '1';
          if (disabledOverlay) {
              disabledOverlay.classList.add('hidden');
          }
      } else {
          btnCam.classList.add('bg-red-500', 'hover:bg-red-600');
          btnCam.classList.remove('bg-white/20', 'hover:bg-white/40');
          btnCam.innerHTML = '<i class="fas fa-video-slash"></i>';
          videoEl.style.opacity = '0.3';
          if (disabledOverlay) {
              disabledOverlay.classList.remove('hidden');
          }
      }
  }

  function endCall() {
    isInterviewActive = false;
    isAIProcessing = false;
    clearTimeout(silenceTimer);
    
    // Explicitly cancel all AI voice immediately
    if (synth) synth.cancel();
    window.speechSynthesis.cancel();
    
    // Stop recording pipeline
    if (mediaRecorder && isRecording) {
        mediaRecorder.onstop = null;
        try { mediaRecorder.stop(); } catch(e){}
    }
    if (vadInterval) { clearInterval(vadInterval); vadInterval = null; }
    if (audioContext) { try { audioContext.close(); } catch(e){} audioContext = null; analyser = null; microphone = null; }
    audioOnlyStream = null;

    // Stop MediaPipe tracking (non-fatal)
    cleanupFaceMesh();

    // CRITICAL: Completely destroy all media stream tracks.
    // This is what turns OFF the browser camera/mic indicator in the tab.
    if (stream) {
        stream.getTracks().forEach((t) => {
            t.stop();
            t.enabled = false;
        });
        stream = null;
    }
    
    // Clear video element to remove frozen frame
    if (videoEl) {
        videoEl.srcObject = null;
    }

    const disabledOverlay = document.getElementById('cameraDisabledOverlay');
    if (disabledOverlay) {
        disabledOverlay.classList.add('hidden');
    }
    
    overlay.classList.remove('hidden');
    liveSubtitlesPanel.classList.add('hidden');
    interviewControls.classList.add('hidden');
    if (startBtn) startBtn.innerHTML = '<i class="fas fa-redo mr-2"></i> RETAKE INTERVIEW';
  }

  // --- Indian Accent & Custom Phrase Cleanup Utility ---
  function cleanTranscript(text) {
      if (!text) return "";
      let cleaned = text;
      // Common misinterpretations
      const corrections = [
          { regex: /\btechnology india\b/gi, replacement: "Techno India" },
          { regex: /\buni\b/gi, replacement: "University" },
          { regex: /\bbsc it\b/gi, replacement: "BSc IT" },
          { regex: /\baiml\b/gi, replacement: "AI/ML" },
          { regex: /\bdata signs\b/gi, replacement: "Data Science" },
          { regex: /\bsoftware engineering\b/gi, replacement: "Software Engineer" }
      ];
      
      corrections.forEach(c => {
          cleaned = cleaned.replace(c.regex, c.replacement);
      });
      return cleaned;
  }

  if (btnEnd) btnEnd.addEventListener('click', endCall);
  if (btnCam) btnCam.addEventListener('click', toggleVideo);
  if (btnMic) btnMic.addEventListener('click', toggleAudio);

  // Ensure voices are loaded
  if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => synth.getVoices();
  }

  // --- UI Data Persistence (Issue 3) ---
  async function restoreLatestInterview() {
      try {
          const res = await authFetch(`${API_BASE}/interview/latest`);
          if (!res.ok) return;
          const data = await res.json();
          
          if (data.success && data.interview) {
              const inv = data.interview;
              
              if (overallScore) overallScore.textContent = `${(inv.overallScore || 0).toFixed(1)} / 5.0`;
              
              if (aiSuggestions && inv.suggestions && inv.suggestions.length > 0) {
                  aiSuggestions.innerHTML = inv.suggestions.map(s => `<li class="px-3 py-2 rounded-lg bg-[#fffbff] border border-[#f3e8e3] text-black shadow-sm">${s}</li>`).join('');
              }
              
              updateStars('confStars', inv.confidenceScore || 3);
              updateStars('clarStars', inv.clarityScore || 3);
              
              // Do NOT permanently hide the interview section. Keep Retake Interview button visible.
              if (startBtn) {
                  startBtn.innerHTML = '<i class="fas fa-redo mr-2"></i> RETAKE INTERVIEW';
              }
          }
      } catch (err) {
          console.error("Failed to restore latest interview feedback:", err);
      }
  }

  // Trigger on auth load if Firebase is available
  if (window.firebase && firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
          if (user) {
              restoreLatestInterview();
          }
      });
  } else {
      // Fallback if not using firebase globally
      setTimeout(restoreLatestInterview, 2000);
  }

})();

// ------ This makes the login link redirect back to this page after login. ------
document.addEventListener('DOMContentLoaded', () => {
  const navLogin = document.getElementById('navLogin');
  if (!navLogin) return;
  navLogin.addEventListener('click', (e) => {
    e.preventDefault();
    const path = window.location.pathname + window.location.search;
    window.location.href = '/login.html?redirect=' + encodeURIComponent(path);
  });
});
