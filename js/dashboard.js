// -------- dashboard.js ---------
import { onAuthChange, uploadProfilePhoto } from "./auth.js";
import { getAuth, updateProfile } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { authFetch } from './utils/authFetch.js';
import { API_BASE } from './config/api.js';

const auth = getAuth();

let lastMockCycle = 0;
let lastAptCycle = 0;

function updateGamificationStats(userDoc) {
  const mockCount = userDoc.mockTestCount || 0;
  const aptCount = userDoc.aptitudeTestCount || 0;
  const totalPoints = userDoc.totalPoints || 0;

  // Mock Test Cycle (4 tests = 100%)
  const mockCycleMod = mockCount % 4;
  const mockPercent = mockCount > 0 && mockCycleMod === 0 ? 100 : (mockCycleMod * 25);
  const mockFracStr = mockCount > 0 && mockCycleMod === 0 ? '4/4' : `${mockCycleMod}/4`;
  
  const pFill1 = document.getElementById('progress-fill-1');
  const pFrac1 = document.getElementById('progress-frac-1');
  if (pFill1) pFill1.style.width = `${mockPercent}%`;
  if (pFrac1) pFrac1.textContent = mockFracStr;

  // Aptitude Test Cycle (4 tests = 100%)
  const aptCycleMod = aptCount % 4;
  const aptPercent = aptCount > 0 && aptCycleMod === 0 ? 100 : (aptCycleMod * 25);
  const aptFracStr = aptCount > 0 && aptCycleMod === 0 ? '4/4' : `${aptCycleMod}/4`;

  const pFill2 = document.getElementById('progress-fill-2');
  const pFrac2 = document.getElementById('progress-frac-2');
  if (pFill2) pFill2.style.width = `${aptPercent}%`;
  if (pFrac2) pFrac2.textContent = aptFracStr;

  // Total Tests display
  const totalTests = document.getElementById('tests-count');
  if (totalTests) totalTests.textContent = String(mockCount + aptCount).padStart(2, '0');

  // Gauge scale (Max 100 points for full gauge)
  const gaugePercent = Math.min(100, Math.max(0, totalPoints));
  const gaugeArc = document.getElementById('gauge-arc');
  const gaugeLabel = document.getElementById('gauge-label');
  if (gaugeArc) {
    const dashVal = (gaugePercent / 100) * 180;
    gaugeArc.setAttribute('stroke-dasharray', `${dashVal} 180`);
  }
  if (gaugeLabel) {
    gaugeLabel.textContent = `${gaugePercent}%`;
  }

  // Popups for rewards
  const currentMockCycle = Math.floor(mockCount / 4);
  const currentAptCycle = Math.floor(aptCount / 4);

  // Since this gets called on load, we don't want to spam popups on refresh.
  // We only show popups if the local cycle count changed during the session.
  if (lastMockCycle > 0 && currentMockCycle > lastMockCycle) {
    showRewardPopup("10 Points", "Completing a Mock Test Cycle");
  }
  if (lastAptCycle > 0 && currentAptCycle > lastAptCycle) {
    showRewardPopup("5 Points", "Completing an Aptitude Test Cycle");
  }

  // Update tracking
  lastMockCycle = mockCount > 0 ? currentMockCycle : 0;
  if (mockCount > 0 && mockCount % 4 === 0) lastMockCycle = currentMockCycle - 1; // if exactly at cycle, prepare for next

  lastAptCycle = aptCount > 0 ? currentAptCycle : 0;
  if (aptCount > 0 && aptCount % 4 === 0) lastAptCycle = currentAptCycle - 1;
}

function showRewardPopup(pointsText, reasonText) {
  const modal = document.getElementById('points-reward-modal');
  const msg = document.getElementById('points-reward-message');
  if (modal && msg) {
    msg.textContent = `You have earned ${pointsText} for ${reasonText}.`;
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
  }
}

// Add close modal handler
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('close-points-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const modal = document.getElementById('points-reward-modal');
      modal.classList.add('opacity-0');
      setTimeout(() => modal.classList.add('hidden'), 300);
    });
  }
});


// Elements
const avatarEl = document.getElementById("profile-avatar");
const changePhotoBtn = document.getElementById("change-photo");
const photoInput = document.getElementById("photo-input");
const displayNameEl = document.getElementById("display-name");
const editNameBtn = document.getElementById("edit-name");
const displayEmailEl = document.getElementById("display-email");

// Inline edit elements
const editForm = document.getElementById("edit-name-form");
const editInput = document.getElementById("edit-name-input");
const saveBtn = document.getElementById("save-name");
const cancelBtn = document.getElementById("cancel-name");

// Modal elements for photo
const modal = document.getElementById("photo-modal");
const previewImg = document.getElementById("photo-preview");
const savePhotoBtn = document.getElementById("save-photo");
const cancelPhotoBtn = document.getElementById("cancel-photo");

let selectedFile = null;
let cropper = null;

// ----------------------- Toast Notification -------------------------
 
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");

  toast.className = `flex items-center justify-between px-4 py-3 rounded-lg shadow-md 
                     bg-[#fffbff] border border-[#ebd8d0] animate-slideIn`;

  toast.innerHTML = `
    <div class="flex items-center gap-2 text-[#2b2421]">
      <span class="text-green-600"><i class="fas fa-check-circle"></i></span>
      <span>${message}</span>
    </div>
    <button class="ml-3 text-[#a62d29] hover:text-black">&times;</button>
  `;

  container.appendChild(toast);

  // Manual close
  toast.querySelector("button").addEventListener("click", () => {
    toast.classList.remove("animate-slideIn");
    toast.classList.add("animate-slideOut");
    setTimeout(() => toast.remove(), 400);
  });

  // Auto remove after 5s
  setTimeout(() => {
    toast.classList.remove("animate-slideIn");
    toast.classList.add("animate-slideOut");
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

// small helper to safely insert plain text into DOM
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, function(m) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];
  });
}

// --------------------------- Star System -----------------------------

const STAR_STORAGE_KEY = "viscarai_star_awarded_v1";

function createStarSystem() {
  const container = document.getElementById("star-row");
  if (!container) return;

  // clear prior content
  container.innerHTML = "";

  // helper to create an SVG star 
  function makeStar(id, size = 18) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.style.display = "inline-block";
    svg.style.verticalAlign = "middle";
    svg.style.marginRight = "6px";

    // ClipPath id unique for per star
    const defs = document.createElementNS(ns, "defs");
    const clip = document.createElementNS(ns, "clipPath");
    const clipId = `star-clip-${id}`;
    clip.setAttribute("id", clipId);

    // This defines how much of the star is visible 
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", "0"); 
    rect.setAttribute("height", "24");
    rect.setAttribute("data-role", "clip-rect");

    clip.appendChild(rect);
    defs.appendChild(clip);
    svg.appendChild(defs);

    // star path 
    const starPathD = "M12 .587l3.668 7.431 8.2 1.192-5.93 5.782 1.401 8.168L12 18.897l-7.339 3.864 1.401-8.168L.132 9.21l8.2-1.192z";

    const bg = document.createElementNS(ns, "path");
    bg.setAttribute("d", starPathD);
    bg.setAttribute("fill", "transparent");
    bg.setAttribute("stroke", "#caa89f");
    bg.setAttribute("stroke-width", "1");
    svg.appendChild(bg);

    // filled clipped star 
    const filled = document.createElementNS(ns, "path");
    filled.setAttribute("d", starPathD);
    filled.setAttribute("fill", "#ffd54a"); // yellow-ish
    filled.setAttribute("clip-path", `url(#${clipId})`);
    filled.setAttribute("data-role", "filled-path");
    svg.appendChild(filled);
    svg.dataset.clipId = clipId;
    return svg;
  }

  const size = window.innerWidth > 768 ? 20 : 16;
  for (let i = 0; i < 3; i++) {
    const star = makeStar(i, size);
    star.dataset.index = String(i);
    container.appendChild(star);
  }
}


function setStarProgress(index, percent) {
  const container = document.getElementById("star-row");
  if (!container) return;
  const svg = container.querySelector(`svg[data-index="${index}"]`);
  if (!svg) return;

  const clipRect = svg.querySelector('rect[data-role="clip-rect"]');
  if (!clipRect) return;

  const widthValue = Math.max(0, Math.min(100, Number(percent || 0))) / 100 * 24; 
  clipRect.setAttribute("width", widthValue.toString());
  const filled = svg.querySelector('path[data-role="filled-path"]');
  if (filled) {
    filled.style.opacity = percent > 0 ? "1" : "0.35";
  }
}

function awardStarOnSurveyIfNeeded(sdata) {
  try {
    if (!sdata || typeof sdata !== "object") return false;

    const answers = sdata.answers || {};
    const hasChosenRole = !!(answers.chosenRole && String(answers.chosenRole).trim().length);
    const hasSkills = !!( (answers.skills && String(answers.skills).trim().length) || (sdata.skills && String(sdata.skills).trim().length) );
    const hasStrengths = !!( (answers.strengths && String(answers.strengths).trim().length) || (sdata.strengths && String(sdata.strengths).trim().length) );
    const skillGap = sdata.skill_gap || {};
    const hasSkillGap = (typeof skillGap.matchPercent !== "undefined" && skillGap.matchPercent !== null && String(skillGap.matchPercent).trim().length)
                      || (typeof skillGap.match !== "undefined" && skillGap.match !== null && String(skillGap.match).trim().length);
    const hasRoadmap = !!(sdata.roadmap_text && String(sdata.roadmap_text).trim().length);

    const meaningful = hasChosenRole || hasSkills || hasStrengths || Boolean(hasSkillGap) || hasRoadmap;

    if (!meaningful) {
      return false;
    }

    // Only award once per browser
    const awarded = localStorage.getItem(STAR_STORAGE_KEY);
    if (awarded === "1") {
      setStarProgress(0, 50);
      return false;
    }

    // Award first star 50%
    setStarProgress(0, 50);
    localStorage.setItem(STAR_STORAGE_KEY, "1");

    // Show notification 
    setTimeout(() => {
      showToast("You have earned some star progress for completing your survey!");
    }, 3000);

    return true;
  } catch (e) {
    console.warn("awardStarOnSurveyIfNeeded error", e);
    return false;
  }
}


try {
  createStarSystem();
} catch (e) {
  console.warn("createStarSystem init failed:", e);
}

// ---------------------------  Listen for Auth Changes ----------------------------- 

onAuthChange(async (user, userDoc) => {
  if (!user) {
    window.location.href = "./login.html";
    return;
  }

  // Sync avatar along with name and email
  avatarEl.src = user.photoURL || "./assets/logo.png";
  displayNameEl.textContent = user.displayName || "Anonymous User";
  displayEmailEl.textContent = user.email || "No email";

  if (userDoc) {
    document.getElementById("goal-val").textContent = userDoc.goals || "none";
    document.getElementById("skills-val").textContent =
      (userDoc.skills && Array.isArray(userDoc.skills) ? userDoc.skills.join(", ") : (userDoc.skills || "none")) || "none";
    document.getElementById("strength-val").textContent =
      (userDoc.strengths && Array.isArray(userDoc.strengths) ? userDoc.strengths.join(", ") : (userDoc.strengths || "none")) || "none";
    
    updateGamificationStats(userDoc);
  }

   // --- Start: load last survey (skill gap + roadmap) and update dashboard UI ---
  try {
    const surveyRes = await authFetch(`${API_BASE}/survey/last`);
    if (surveyRes.ok) {
      const sdata = await surveyRes.json();

// ensuring dynamic styles exist (only once)
if (!document.getElementById("dashboard-dyn-style")) {
  const style = document.createElement("style");
  style.id = "dashboard-dyn-style";
  style.innerHTML = `
    /* base sizes (you can tweak these) */
    #goal-val, #skills-val, #strength-val {
      font-size: 15px;
      line-height: 1.25;
      word-break: break-word;
      white-space: normal;
    }
    /* when content is long, reduce size to fit visually */
    .dash-small-text { font-size: 13px !important; line-height: 1.2 !important; }
    /* allow nicer wrapping for multi-line content */
    .dash-multi-line { white-space: normal; }
    /* clamp visually for extremely long single-line strings (optional) */
    .dash-clamp {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    @media (min-width: 1024px) {
      #goal-val, #skills-val, #strength-val { font-size: 16px; }
      .dash-small-text { font-size: 14px !important; }
    }
  `;
  document.head.appendChild(style);
}

// helper to apply size/wrap and tooltip 
function setProfileField(el, text) {
  if (!el) return;
  const s = String(text || "").trim();
  el.textContent = s || "none";
  el.setAttribute("title", s || "none");

  // reseting classes that our earlier CSS have added
  el.classList.remove("dash-small-text", "dash-multi-line", "dash-clamp");

  // Reset inline styles first 
  el.style.fontSize = "";
  el.style.lineHeight = "";
  el.style.maxHeight = "";
  el.style.overflow = "";
  el.style.display = "";
  el.style.webkitLineClamp = "";

  // Determine base sizes depending on viewport 
  const isDesktop = window.innerWidth >= 1024;
  const baseSize = isDesktop ? 12 : 13;     
  const smallSize = isDesktop ? 12 : 13;    
  const verySmallSize = isDesktop ? 5 : 6; 

  if (s.length === 0 || s === "none") {
    el.style.fontSize = `${smallSize}px`;
    el.style.lineHeight = "1.25";
  } else if (s.length > 120) {
    el.style.fontSize = `${verySmallSize}px`;
    el.style.lineHeight = "1.2";
    el.classList.add("dash-multi-line", "dash-clamp");
    el.style.display = "-webkit-box";
    el.style.webkitBoxOrient = "vertical";
    el.style.webkitLineClamp = "3";
    el.style.overflow = "hidden";
  } else if (s.length > 70) {
    el.style.fontSize = `${smallSize}px`;
    el.style.lineHeight = "1.22";
    el.classList.add("dash-multi-line");
  } else if (s.length > 40) {
    el.style.fontSize = `${smallSize}px`;
    el.style.lineHeight = "1.2";
    el.classList.add("dash-multi-line");
  } else {
    el.style.fontSize = `${baseSize}px`;
    el.style.lineHeight = "1.3";
  }
}

const answers = sdata.answers || {};

// prefer
const chosenRoleFromSurvey = (answers && answers.chosenRole) || sdata.chosenRole || (userDoc && userDoc.goals) || "";
const goalEl = document.getElementById("goal-val");
setProfileField(goalEl, chosenRoleFromSurvey);

// skills
const skillsFromSurvey = (answers && answers.skills) || sdata.skills || (userDoc && (Array.isArray(userDoc.skills) ? userDoc.skills.join(", ") : userDoc.skills)) || "";
const skillsEl = document.getElementById("skills-val");
setProfileField(skillsEl, skillsFromSurvey);

// strengths
const strengthsFromSurvey = (answers && answers.strengths) || sdata.strengths || (userDoc && (Array.isArray(userDoc.strengths) ? userDoc.strengths.join(", ") : userDoc.strengths)) || "";
const strengthEl = document.getElementById("strength-val");
setProfileField(strengthEl, strengthsFromSurvey);

      // Helper for small pie
      function updatePiePercent(percent) {
        try {
          const pct = Math.max(0, Math.min(100, Number(percent || 0)));
          const pieSlice = document.getElementById("pie-slice");
          const pieLabel = document.getElementById("pie-label");
          if (pieSlice) {
            const r = 54;
            const circumference = 2 * Math.PI * r;
            const dash = (pct / 100) * circumference;
            pieSlice.setAttribute("stroke-dasharray", `${dash} ${circumference}`);
            pieSlice.setAttribute("stroke-linecap", "round");
          }
          if (pieLabel) pieLabel.textContent = `${Math.round(pct)}%`;
        } catch (e) {
          console.warn("updatePiePercent error", e);
        }
      }

      if (sdata.skill_gap) {
        const sg = sdata.skill_gap;
        const percent = Number(sg.matchPercent ?? sg.match ?? 0);

        // updating numeric header element
        const skillsGapEl = document.getElementById("skills-gap");
        if (skillsGapEl) skillsGapEl.textContent = String(Math.round(percent)).padStart(2, '0');

        // updating only the pie + label 
        updatePiePercent(percent);

        // updating 'skills-val' with currentSkills 
        try {
          const summaryEl = document.getElementById("skills-val");
          if (summaryEl) {
            const cur = Array.isArray(sg.currentSkills) ? sg.currentSkills.join(", ") : (sg.currentSkills || "");
            if (cur) summaryEl.textContent = cur;
          }
        } catch(e){/*ignore*/}
      }

      // ------- Minimal roadmap rendering  ------

      if (typeof escapeHtml !== 'function') {
        const escapeHtml = (str) => {
          if (typeof str !== 'string') return '';
          return str.replace(/[&<>"']/g, function(m) {
            return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];
          });
        };
        window.escapeHtml = escapeHtml;
      }

      // Render roadmap_text into existing #roadmap-list
      if (sdata.roadmap_text) {
        let raw = String(sdata.roadmap_text || "")
        .replace(/\*\*/g, "")  
        const roadmapUl = document.getElementById("roadmap-list");
        if (roadmapUl) {
          // clear existing placeholders
          roadmapUl.innerHTML = "";

          const lines = raw.split(/\r?\n/);
          const steps = [];
          let cur = null;
          for (let ln of lines) {
            const line = ln.trim();
            if (!line) {
              if (cur) cur.body.push("");
              continue;
            }
            const m = line.match(/^(?:#+\s*)?(?:Step\s*)?(\d+)\s*[.\-—–:]\s*(.+)$/i);
            if (m) {
              if (cur) steps.push(cur);
              cur = { num: Number(m[1]), title: m[2].trim(), body: [] };
            } else {
              if (cur) cur.body.push(line);
            }
          }
          if (cur) steps.push(cur);

          let roadmapMsg = null;
          try {
            let cardParent = roadmapUl.closest && roadmapUl.closest('section') ? roadmapUl.closest('section') : roadmapUl.parentNode;
            if (cardParent) {
              roadmapMsg = cardParent.querySelector('p.mb-3.text-sm');
              if (!roadmapMsg) {
                const ps = cardParent.querySelectorAll('p');
                for (const p of ps) {
                  if (p.textContent && /currently\s+no\s+roadmap/i.test(p.textContent.trim())) {
                    roadmapMsg = p;
                    break;
                  }
                }
              }
            }
          } catch (e) {
            roadmapMsg = null;
          }

          let renderedAny = false;
          if (steps.length > 0) {
for (const s of steps) {
  const li = document.createElement("li");
  li.className = "mb-6 relative";

  const titleRow = document.createElement("div");
  titleRow.className = "flex justify-between items-start mb-2";

  const titleText = document.createElement("strong");
  titleText.className = "text-[#4b4340] text-base font-bold flex-1";
  titleText.innerHTML = `Step ${s.num} — ${escapeHtml(s.title)}`;

  const checkboxContainer = document.createElement("div");
  checkboxContainer.className = "ml-4 flex-shrink-0 flex items-center";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  // Standard large checkbox matching reference image
  checkbox.style.width = "20px";
  checkbox.style.height = "20px";
  checkbox.style.cursor = "pointer";
  checkbox.className = "rounded border-gray-300 text-[#007bff] focus:ring-[#007bff]";
  
  checkboxContainer.appendChild(checkbox);

  titleRow.appendChild(titleText);
  titleRow.appendChild(checkboxContainer);

  const bodyDiv = document.createElement("div");
  bodyDiv.className = "text-sm text-gray-600 leading-relaxed";
  bodyDiv.innerHTML = s.body.map(b => escapeHtml(b)).join("<br/>") || "&nbsp;";

  li.appendChild(titleRow);
  li.appendChild(bodyDiv);

  function ordinalWord(n) {
    const map = ["zeroth","first","second","third","fourth","fifth","sixth","seventh","eighth","ninth","tenth"];
    if (n >= 0 && n < map.length) return map[n];
    const j = n % 10, k = n % 100;
    if (j == 1 && k != 11) return n + "st";
    if (j == 2 && k != 12) return n + "nd";
    if (j == 3 && k != 13) return n + "rd";
    return n + "th";
  }

  // Persist and restore checkbox state using localStorage
  try {
    const uidPart = (typeof user !== "undefined" && user && user.uid) ? String(user.uid) : "anon";
    const key = `roadmap_checked_${uidPart}_step_${s.num}`;

    // assigning id for accessibility
    const cbId = `roadmap-cb-${uidPart}-${s.num}`;
    checkbox.id = cbId;
    titleText.setAttribute("aria-labelledby", cbId);

    // restore state
    const stored = localStorage.getItem(key);
    if (stored === "1") {
      checkbox.checked = true;
      titleText.classList.add("opacity-60", "line-through");
    }

    // toggle handler (showing left-side toast with ordinal text)
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        localStorage.setItem(key, "1");
        titleText.classList.add("opacity-60", "line-through");

        const stepWord = ordinalWord(Number(s.num));
        showToast(`You have completed your ${stepWord} step towards bridging your skill gap`);
      } else {
        localStorage.removeItem(key);
        titleText.classList.remove("opacity-60", "line-through");
      }
    });
  } catch (e) {
    console.warn("roadmap checkbox storage failed", e);
  }

  roadmapUl.appendChild(li);
}
            renderedAny = true;
          } else {
            const trimmed = raw.trim();
            if (trimmed.length) {
              const li = document.createElement("li");
              li.className = "text-sm text-[#6b5b55] whitespace-pre-wrap";
              li.textContent = trimmed;
              roadmapUl.appendChild(li);
              renderedAny = true;
            } else {
              renderedAny = false;
            }
          }

          try {
            if (roadmapMsg) {
              roadmapMsg.style.display = renderedAny ? "none" : "";
            }
            if (renderedAny) {
              roadmapUl.classList.remove('hidden');
            }
          } catch (e) {
          }
        }
      }
      try {
          awardStarOnSurveyIfNeeded(sdata);
          } catch(e) { console.warn("star award failed", e); }
  }

    // --- Start: load interview stats and update progress ---
    try {
        const interviewRes = await authFetch(`${API_BASE}/interview/stats`);
        if (interviewRes.ok) {
            const idata = await interviewRes.json();
            const count = idata.count || 0;
            
            const progressFill = document.getElementById("progress-fill-3");
            const progressFrac = document.getElementById("progress-frac-3");
            
            let points = 0;
            if (count === 1) points = 7.5;
            else if (count >= 2) points = 15;
            
            const percent = (points / 15) * 100;
            
            if (progressFill) progressFill.style.width = `${percent}%`;
            if (progressFrac) progressFrac.textContent = count > 0 ? `${points}/15` : `0/15`;

            // Update gauge count
            const testsCountEl = document.getElementById("tests-count");
            if (testsCountEl) {
                // If there's an existing count, we add the interview count
                const currentCount = parseInt(testsCountEl.textContent || "0");
                testsCountEl.textContent = String(currentCount + count).padStart(2, '0');
            }

            // Show Toast if new points earned
            const LAST_INTERVIEW_COUNT_KEY = "viscarai_last_interview_count";
            const lastCount = parseInt(localStorage.getItem(LAST_INTERVIEW_COUNT_KEY) || "0");
            if (count > lastCount) {
                localStorage.setItem(LAST_INTERVIEW_COUNT_KEY, count.toString());
                if (count === 1) showToast("You have earned 7.5 bonus points for your first Live AI Interview!");
                else if (count === 2) showToast("You have earned 15 bonus points for completing Live AI Interviews!");
                
                // Increase profile star slightly for bonus
                setStarProgress(1, count === 1 ? 50 : 100);
            } else if (count > 0) {
                setStarProgress(1, count === 1 ? 50 : 100);
            }

            // Check if interview completed popup is pending
            if (localStorage.getItem('interview_completed_popup_pending') === 'true') {
                localStorage.removeItem('interview_completed_popup_pending');
                
                const pointsRewardModal = document.getElementById('points-reward-modal');
                const pointsRewardMessage = document.getElementById('points-reward-message');
                const closePointsModalBtn = document.getElementById('close-points-modal');
                
                if (pointsRewardModal && pointsRewardMessage) {
                    if (count >= 2) {
                        pointsRewardMessage.textContent = "You have earned 15 points for completing both the session.";
                    } else {
                        pointsRewardMessage.textContent = "You have earned 7.5 points for completing one session.";
                    }
                    
                    // Show modal with animation
                    pointsRewardModal.classList.remove('hidden');
                    pointsRewardModal.classList.add('flex');
                    requestAnimationFrame(() => {
                        pointsRewardModal.classList.remove('opacity-0');
                        const card = pointsRewardModal.querySelector('div');
                        if (card) {
                            card.classList.remove('scale-95');
                            card.classList.add('scale-100');
                        }
                    });
                    
                    closePointsModalBtn?.addEventListener('click', () => {
                        pointsRewardModal.classList.add('opacity-0');
                        const card = pointsRewardModal.querySelector('div');
                        if (card) {
                            card.classList.remove('scale-100');
                            card.classList.add('scale-95');
                        }
                        setTimeout(() => {
                            pointsRewardModal.classList.add('hidden');
                            pointsRewardModal.classList.remove('flex');
                        }, 300);
                    });
                }
            }
        }
    } catch(err) {
        console.warn("Failed to load interview stats for dashboard:", err);
    }

    } catch (err) {
        console.warn("Failed to load survey for dashboard:", err);
    }
});

// --------------------------- Change Profile Photo + Crop -----------------------------

changePhotoBtn?.addEventListener("click", () => photoInput.click());

photoInput?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  selectedFile = file;
  const reader = new FileReader();

  reader.onload = (ev) => {
    previewImg.src = ev.target.result;

    // Init Cropper
    if (cropper) cropper.destroy();
    cropper = new Cropper(previewImg, {
      aspectRatio: 1,
      viewMode: 1,
      autoCropArea: 1,
      responsive: true,
      background: false,
    });

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  };

  reader.readAsDataURL(file);
});

cancelPhotoBtn?.addEventListener("click", () => {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  selectedFile = null;
  if (cropper) cropper.destroy();
  cropper = null;
  photoInput.value = "";
});

savePhotoBtn?.addEventListener("click", async () => {
  if (!cropper) return;

  const canvas = cropper.getCroppedCanvas({
    width: 400,
    height: 400,
    fillColor: "#fff", 
  });

  if (!canvas) {
    console.error("No canvas generated from cropper.");
    return;
  }

  // Compress image to keep size low (<1MB)
  canvas.toBlob(
    async (blob) => {
      if (!blob) {
        console.error("Failed to create blob from canvas.");
        return;
      }

      console.log("Blob size (KB):", Math.round(blob.size / 1024));

      try {
        const user = auth.currentUser;
        if (!user) return;

        // Convert to File 
        const file = new File([blob], "profile.jpg", { type: "image/jpeg" });

         const url = await uploadProfilePhoto(blob); // from Cloudinary
         await updateProfile(user, { photoURL: url }); // update Firebase Auth

         await authFetch(`${API_BASE}/user/profile`, {
           method: 'PUT',
           body: JSON.stringify({ photoURL: url })
         });


        avatarEl.src = url;
        const navAvatar = document.querySelector("#navAuthContainer img");
        if (navAvatar) navAvatar.src = url;

        modal.classList.add("hidden");
        modal.classList.remove("flex");

        if (cropper) cropper.destroy();
        cropper = null;
        photoInput.value = "";
        selectedFile = null;

        showToast("Profile picture uploaded successfully ✅");
      } catch (err) {
        console.error("Photo upload error:", err);
        showToast("Failed to update photo ❌", "error");
      }
    },
    "image/jpeg",
    0.8 
  );
});

// --------------------------- Edit Username  -----------------------------

editNameBtn?.addEventListener("click", () => {
  editInput.value = displayNameEl.textContent;
  editForm.classList.remove("hidden");
  editForm.classList.add("flex");
  displayNameEl.classList.add("hidden");
  editNameBtn.classList.add("hidden");
});

cancelBtn?.addEventListener("click", () => {
  editForm.classList.add("hidden");
  editForm.classList.remove("flex");
  displayNameEl.classList.remove("hidden");
  editNameBtn.classList.remove("hidden");
});

saveBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const newName = editInput.value.trim();
  if (!newName) return;

  try {
    await updateProfile(user, { displayName: newName });

    await authFetch(`${API_BASE}/user/profile`, {
      method: 'PUT',
      body: JSON.stringify({ displayName: newName })
    });

    displayNameEl.textContent = newName;
    editForm.classList.add("hidden");
    editForm.classList.remove("flex");
    displayNameEl.classList.remove("hidden");
    editNameBtn.classList.remove("hidden");

    showToast("Username updated successfully ✅");
  } catch (err) {
    console.error("Name update error:", err);
    showToast("Failed to update name ❌", "error");
  }
});

//Dashboard Animations
document.addEventListener("DOMContentLoaded", () => {
  const statCards = document.querySelectorAll(
    "section.mt-6.grid .rounded-2xl.border.bg-white.p-4"
  );

  statCards.forEach((card, i) => {
    setInterval(() => {
      card.animate(
        [
          { boxShadow: "0 0 0px rgba(166,45,41,0.3)" },
          { boxShadow: "0 0 18px rgba(166,45,41,0.5)" },
          { boxShadow: "0 0 0px rgba(166,45,41,0.3)" }
        ],
        { duration: 2500, iterations: 1, easing: "ease-in-out" }
      );
    }, 3000 + i * 500); 
  });
});

