const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'take-test.js');
let code = fs.readFileSync(filePath, 'utf-8');

// 1. Replace Variables
const varRegex = /let isMicEnabled = true;\s+let isCamEnabled = true;\s+let silenceTimer = null;\s+const SILENCE_TIMEOUT_MS = 10000; \/\/ Reduced from 20s to 10s for faster AI response\s+let currentAnswerTranscript = "";\s+let lastInterimTranscript = ""; \/\/ Track lingering interim words\s+let userSubtitleDiv = null;\s+\/\/ Speech APIs\s+const SpeechRecognition = window\.SpeechRecognition \|\| window\.webkitSpeechRecognition;\s+let recognition = null;\s+let synth = window\.speechSynthesis;/g;

const varReplacement = `  let isMicEnabled = true;
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

  let synth = window.speechSynthesis;`;
  
code = code.replace(varRegex, varReplacement);

// 2. DOMContentLoaded for Resume
const domReadyCode = `  // Browser Refresh Recovery
  document.addEventListener('DOMContentLoaded', async () => {
      try {
          const res = await authFetch(\`\${API_BASE}/interview/resume\`);
          if (res.ok) {
              const data = await res.json();
              if (data && data.success && data.sessionId) {
                  showResumeModal(data);
              }
          }
      } catch (e) { console.warn("Resume check failed", e); }
  });
  
  function showResumeModal(resumeData) {
      const modalHtml = \`
          <div id="resumeModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div class="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-lg">
                  <div class="w-16 h-16 bg-[#eac9c1] rounded-full flex items-center justify-center mx-auto mb-4 text-[#98422f] text-3xl"><i class="fas fa-history"></i></div>
                  <h3 class="text-xl font-bold text-[#653b2e] text-center mb-2">Resume Previous Interview?</h3>
                  <p class="text-sm text-[#803c2c] text-center mb-6">You left your interview for \${resumeData.role} at Question \${resumeData.currentQuestion}/10. Would you like to continue where you left off?</p>
                  <div class="flex justify-center gap-4">
                      <button id="btnStartNew" class="px-5 py-2 border-2 border-[#bc7e6a] text-[#bc7e6a] rounded-lg hover:bg-[#F8EDEB] font-medium transition">Start New Interview</button>
                      <button id="btnResume" class="px-5 py-2 bg-[#bc7e6a] text-white rounded-lg hover:bg-[#d3ab9e] font-medium shadow transition">Resume Interview</button>
                  </div>
              </div>
          </div>
      \`;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      document.getElementById('btnStartNew').onclick = async () => {
          document.getElementById('resumeModal').remove();
          await authFetch(\`\${API_BASE}/interview/abandon\`, { method: 'POST' });
          if (startBtn) startBtn.click();
      };
      document.getElementById('btnResume').onclick = async () => {
          document.getElementById('resumeModal').remove();
          startResumeFlow(resumeData);
      };
  }
  
  async function startResumeFlow(data) {
      if (startBtn) startBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Restoring Interview...';
      try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (videoEl) videoEl.srcObject = stream;
          setupFaceMesh();
          
          sessionId = data.sessionId;
          currentQuestionIndex = data.currentQuestion;
          if (interviewRoleSpan) interviewRoleSpan.textContent = data.role;
          isInterviewActive = true;
          updateQuestionCounter();

          overlay.classList.add('hidden');
          liveSubtitlesPanel.classList.remove('hidden');
          interviewControls.classList.remove('hidden');
          subtitleScrollArea.innerHTML = '';
          
          isMicEnabled = true;
          btnMic.classList.remove('bg-red-500', 'hover:bg-red-600');
          btnMic.classList.add('bg-white/20', 'hover:bg-white/40');
          btnMic.innerHTML = '<i class="fas fa-microphone"></i>';
          isCamEnabled = true;
          btnCam.classList.remove('bg-red-500', 'hover:bg-red-600');
          btnCam.classList.add('bg-white/20', 'hover:bg-white/40');
          btnCam.innerHTML = '<i class="fas fa-video"></i>';
          videoEl.style.opacity = '1';
          const disabledOverlay = document.getElementById('cameraDisabledOverlay');
          if (disabledOverlay) disabledOverlay.classList.add('hidden');

          if (data.transcripts) {
              data.transcripts.forEach(t => {
                  const parts = t.split('\\nA: ');
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
          
          if (currentQuestionIndex < 10) {
              const nextQ = data.questions[currentQuestionIndex];
              speakAndListen(nextQ);
          } else {
              finishInterview();
          }
      } catch (err) {
          console.error(err);
          alert('Could not resume interview.');
          if (startBtn) startBtn.innerHTML = '<i class="fas fa-play mr-2"></i> START YOUR INTERVIEW';
      }
  }

  if (startBtn) {`;

code = code.replace("  if (startBtn) {", domReadyCode);

// 3. Update startBtn click
const startBtnRegex = /startBtn\.addEventListener\('click', async \(\) => \{\s+startBtn\.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"><\/i> Connecting to AI Interviewer\.\.\.';/g;
const startBtnReplacement = `startBtn.addEventListener('click', async () => {
      try {
        const surveyRes = await authFetch(\`\${API_BASE}/survey/last\`);
        if (surveyRes.ok) {
          const surveyData = await surveyRes.json();
          const hasRole = surveyData && (surveyData.chosenRole || (surveyData.answers && surveyData.answers.chosenRole));
          if (!hasRole) {
            overlay.innerHTML = \`
              <div class="text-center py-6">
                <div class="w-16 h-16 bg-[#F8EDEB] rounded-full flex items-center justify-center mx-auto mb-4 text-[#98422f] text-3xl"><i class="fas fa-lock"></i></div>
                <h3 class="text-lg font-bold text-white mb-2">Career Assessment Required</h3>
                <p class="text-sm text-gray-300 mb-4">Please complete your Career Assessment first to unlock personalized AI Interviews.</p>
                <a href="career-assist.html" class="inline-block px-6 py-2 rounded-xl bg-[#bc7e6a] hover:bg-[#d3ab9e] text-white font-semibold shadow transition">Go To Career Assist</a>
              </div>
            \`;
            return;
          }
        }
      } catch (e) { console.warn('Survey check failed', e); }

      startBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Connecting to AI Interviewer...';`;

code = code.replace(startBtnRegex, startBtnReplacement);

const backendSessionRegex = /\/\/ 3\. Start Backend Session\s+const res = await authFetch\(`\$\{API_BASE\}\/interview\/start`, \{ method: 'POST' \}\);\s+if \(!res\.ok\) throw new Error\("Failed to start session"\);\s+const data = await res\.json\(\);/g;
const backendSessionReplacement = `// 3. Start Backend Session
        const res = await authFetch(\`\${API_BASE}/interview/start\`, { method: 'POST' });
        if (!res.ok) throw new Error("Failed to start session");
        const data = await res.json();
        
        if (data.resumeAvailable) {
            showResumeModal(data);
            return;
        }`;

code = code.replace(backendSessionRegex, backendSessionReplacement);

// 4. Replace listening & processing logic
const regexListen = /  function resetSilenceTimer\(\) \{[\s\S]*?  async function submitUserAnswer\(transcript\) \{[\s\S]*?  async function finishInterview\(\) \{/g;
const newListenCode = `  function resetSilenceTimer() {
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
      if (!stream) return;

      if (!audioContext) {
          try {
              audioContext = new (window.AudioContext || window.webkitAudioContext)();
              analyser = audioContext.createAnalyser();
              analyser.fftSize = 512;
              analyser.smoothingTimeConstant = 0.1;
              microphone = audioContext.createMediaStreamSource(stream);
              microphone.connect(analyser);
          } catch(e) {
              console.error("Audio VAD init failed", e);
          }
      }

      const audioOptions = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm') && MediaRecorder.isTypeSupported('audio/mp4')) {
          audioOptions.mimeType = 'audio/mp4';
      }
      
      mediaRecorder = new MediaRecorder(stream, audioOptions);
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
              div.textContent = 'Listening...';
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
          clearTimeout(silenceTimer);
          const ind = document.getElementById('listeningIndicator');
          if (ind) ind.remove();

          if (audioChunks.length === 0) {
              submitUserAnswer("(No response provided)");
              return;
          }

          const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
          processAudio(audioBlob);
      };

      mediaRecorder.start(250);
  }

  function monitorVAD() {
      if (!analyser) return;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceStart = Date.now();
      let hasSpoken = false;

      vadInterval = setInterval(() => {
          if (!isInterviewActive || !isRecording) return;
          analyser.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) { sum += dataArray[i]; }
          let average = sum / dataArray.length;

          if (average > 15) { // speaking threshold
              silenceStart = Date.now();
              if (!hasSpoken) hasSpoken = true;
          } else {
              if (hasSpoken && Date.now() - silenceStart > 2000) {
                  mediaRecorder.stop();
              } else if (!hasSpoken && Date.now() - silenceStart > SILENCE_TIMEOUT_MS) {
                  mediaRecorder.stop();
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
      formData.append('audio', audioBlob, 'answer.webm');

      try {
          const res = await authFetch(\`\${API_BASE}/interview/transcribe\`, {
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
      const modalHtml = \`
          <div id="transcriptModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div class="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-lg">
                  <h3 class="text-xl font-bold text-gray-800 mb-2">Verify Your Answer</h3>
                  <p class="text-sm text-gray-500 mb-4">We noticed your transcript was quite short or unclear. Please edit or confirm your answer before we submit it to the AI.</p>
                  <textarea id="transcriptEditor" class="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4">\${transcript}</textarea>
                  <div class="flex justify-end gap-3">
                      <button id="btnConfirmTranscript" class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Confirm Answer</button>
                  </div>
              </div>
          </div>
      \`;
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
          const res = await authFetch(\`\${API_BASE}/interview/answer\`, {
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
          finishInterview();
      }
  }

  async function finishInterview() {`;

code = code.replace(regexListen, newListenCode);

// 5. Cleanup toggleAudio and endCall
const toggleAudioRegex = /      if \(isMicEnabled && isInterviewActive\) \{\s+try \{ recognition\.start\(\); \} catch\(e\)\{\}\s+\} else if \(!isMicEnabled && recognition\) \{\s+recognition\.stop\(\);\s+\}/g;
const toggleAudioReplacement = `      if (isMicEnabled && isInterviewActive && !isRecording && !isAIProcessing) {
          startListening();
      } else if (!isMicEnabled && isRecording) {
          mediaRecorder.stop();
      }`;
code = code.replace(toggleAudioRegex, toggleAudioReplacement);

const endCallRegex = /    \/\/ Abort speech recognition and prevent restart loops\s+if \(recognition\) \{\s+recognition\.onend = null;\s+try \{ recognition\.abort\(\); \} catch\(e\)\{\}\s+recognition = null;\s+\}/g;
const endCallReplacement = `    if (mediaRecorder && isRecording) {
        mediaRecorder.onstop = null;
        try { mediaRecorder.stop(); } catch(e){}
    }
    clearInterval(vadInterval);`;
code = code.replace(endCallRegex, endCallReplacement);

const finishInterviewRegex = /      if \(recognition\) \{\s+recognition\.onend = null;\s+try \{ recognition\.abort\(\); \} catch\(e\)\{\}\s+recognition = null;\s+\}/g;
const finishInterviewReplacement = `      if (mediaRecorder && isRecording) {
          mediaRecorder.onstop = null;
          try { mediaRecorder.stop(); } catch(e){}
      }
      clearInterval(vadInterval);`;
code = code.replace(finishInterviewRegex, finishInterviewReplacement);

fs.writeFileSync(filePath, code);
console.log("Successfully patched take-test.js");
