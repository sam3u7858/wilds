/**
 * 用戶界面交互模組
 */

class CharmUI {
  constructor() {
    // 狀態管理
    this.selectedSkills = [];
    this.charmSlots = [0, 0, 0]; // -1 = W1, 0 = empty, 1-3 = level
    this.calculationResults = [];
    this.timeEstimation = null;
    this.isCalculating = false;
    this.failureAnalysis = null;
    this.showFailureDetails = false;
    this.skillHoverLevels = {};

    // 技能選擇器狀態
    this.skillCategories = [
      { id: "all", name: "全部" },
      { id: "weapon_skills", name: "武器技能" },
      { id: "armor_slot1", name: "防具一洞技能" },
      { id: "armor_slot2", name: "防具二洞技能" },
      { id: "armor_slot3", name: "防具三洞技能" },
      { id: "attack", name: "攻擊系" },
      { id: "defense", name: "防禦系" },
      { id: "element", name: "屬性系" },
      { id: "utility", name: "輔助系" },
    ];
    this.selectedCategory = "all";
    this.searchQuery = "";

    // 圖表相關
    this.chartCanvas = null;
    this.chartTooltip = { visible: false, title: "", content: "", x: 0, y: 0 };
    this.chartHoverX = -1;
    this.chartData = [];
  }

  /**
   * 初始化UI
   */
  init() {
    this.initializeSlots();
    this.initializeChart();
    this.bindEvents();
    this.renderSkillCategories();
  }

  /**
   * 初始化鑲嵌槽顯示
   */
  initializeSlots() {
    this.renderSlots();
  }

  /**
   * 初始化圖表
   */
  initializeChart() {
    this.chartCanvas = document.getElementById("chartCanvas");
    if (this.chartCanvas) {
      const ctx = this.chartCanvas.getContext("2d");
      this.drawChart(ctx);
    }
  }

  /**
   * 綁定事件
   */
  bindEvents() {
    // 圖表事件
    if (this.chartCanvas) {
      this.chartCanvas.addEventListener("mousemove", (e) =>
        this.onChartMouseMove(e)
      );
      this.chartCanvas.addEventListener("mouseleave", () =>
        this.onChartMouseLeave()
      );
    }

    // 文檔點擊事件（關閉下拉菜單等）
    document.addEventListener("click", (e) => {
      // 可以在這裡處理全域點擊事件
    });
  }

  /**
   * 渲染鑲嵌槽
   */
  renderSlots() {
    const slotsContainer = document.getElementById("charmSlots");
    if (!slotsContainer) return;

    slotsContainer.innerHTML = "";

    this.charmSlots.forEach((slot, index) => {
      const slotElement = document.createElement("span");
      slotElement.className = "slot";
      slotElement.onclick = () => this.toggleSlot(index);

      // 設定槽位樣式和內容
      if (slot === -1) {
        slotElement.classList.add("weapon-slot");
        slotElement.textContent = "[W1]";
      } else if (slot === 0) {
        slotElement.classList.add("empty");
        slotElement.textContent = "[ ]";
      } else {
        slotElement.classList.add(`level-${slot}`);
        slotElement.textContent = `[${slot}]`;
      }

      slotsContainer.appendChild(slotElement);
    });
  }

  /**
   * 切換槽位狀態
   */
  toggleSlot(index) {
    const currentLevel = this.charmSlots[index];
    // 循環：0 -> 1 -> 2 -> 3 -> -1 -> 0
    if (currentLevel === 3) {
      this.charmSlots[index] = -1;
    } else if (currentLevel === -1) {
      this.charmSlots[index] = 0;
    } else {
      this.charmSlots[index] = currentLevel + 1;
    }

    this.renderSlots();
    this.performCalculation();
  }

  /**
   * 渲染技能分類
   */
  renderSkillCategories() {
    const categoriesContainer = document.getElementById("skillCategories");
    if (!categoriesContainer) return;

    categoriesContainer.innerHTML = "";

    this.skillCategories.forEach((category) => {
      const button = document.createElement("button");
      button.className = "category-button";
      button.textContent = category.name;
      button.onclick = () => this.selectCategory(category.id);

      if (this.selectedCategory === category.id) {
        button.classList.add("active");
      }

      categoriesContainer.appendChild(button);
    });
  }

  /**
   * 選擇技能分類
   */
  selectCategory(categoryId) {
    this.selectedCategory = categoryId;
    this.renderSkillCategories();
    this.renderSkills();
  }

  /**
   * 渲染技能列表
   */
  renderSkills() {
    const skillsGrid = document.getElementById("skillsGrid");
    if (!skillsGrid) return;

    const categorizedSkills = window.CharmData.categorizeSkills();
    if (!categorizedSkills) {
      skillsGrid.innerHTML =
        '<div class="loading-container"><div class="loading-spinner"></div><span class="loading-text">載入技能資料中...</span></div>';
      return;
    }

    let filteredSkills = categorizedSkills[this.selectedCategory] || [];

    // 搜尋過濾
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filteredSkills = filteredSkills.filter((skill) =>
        skill.nameZh.toLowerCase().includes(query)
      );
    }

    skillsGrid.innerHTML = "";

    if (filteredSkills.length === 0) {
      skillsGrid.innerHTML =
        '<div class="empty-text">沒有找到符合條件的技能</div>';
      return;
    }

    filteredSkills.forEach((skill) => {
      const skillCard = this.createSkillCard(skill);
      skillsGrid.appendChild(skillCard);
    });
  }

  /**
   * 創建技能卡片
   */
  createSkillCard(skill) {
    const isSelected = this.isSkillSelected(skill.id);
    const isCompatible = this.isSkillCompatible(skill.id);
    const availableLevels = window.CharmData.getAvailableSkillLevels(skill.id);
    const maxLevel = window.CharmData.getMaxSkillLevel(skill.id);

    const card = document.createElement("div");
    card.className = "skill-card";
    card.onclick = () => this.selectSkill(skill);

    if (isSelected) {
      card.classList.add("selected");
    }
    if (!isCompatible) {
      card.classList.add("incompatible");
    }

    const recommendationText = this.getRecommendationText(skill.id);

    card.innerHTML = `
            <img src="./public/imgs/${skill.color}.png" alt="${
      skill.nameZh
    }" class="skill-icon" />
            <div class="skill-info">
                <span class="skill-name">${skill.nameZh}</span>
                <span class="skill-level-info">${recommendationText}</span>
            </div>
            <div class="available-levels">
                ${availableLevels
                  .map((level) => `<span class="level-badge">${level}</span>`)
                  .join("")}
            </div>
        `;

    return card;
  }

  /**
   * 檢查技能是否已選擇
   */
  isSkillSelected(skillId) {
    return this.selectedSkills.some((skill) => skill.id === skillId);
  }

  /**
   * 檢查技能是否相容
   */
  isSkillCompatible(skillId) {
    const currentSkills = this.selectedSkills.filter(
      (skill) => skill.id !== skillId
    );
    if (currentSkills.length === 0) return true;
    if (this.selectedSkills.length >= 3) return false;

    // Use the new suggestion logic for a precise check
    return window.CharmSuggestion.getBestCompatibleLevel(skillId, currentSkills) !== -1;
  }

  /**
   * 獲取推薦文字
   */
  getRecommendationText(skillId) {
    const maxLevel = window.CharmData.getMaxSkillLevel(skillId);
    const recommendedLevel = window.CharmSuggestion.getRecommendedLevel(skillId, this.selectedSkills);
    const currentSkills = this.selectedSkills.filter(
      (skill) => skill.id !== skillId
    );

    if (currentSkills.length === 0) {
      return `最高 Lv.${maxLevel}`;
    }

    if (recommendedLevel === -1) {
      return `不相容`;
    }

    if (recommendedLevel === maxLevel) {
      return `推薦 Lv.${recommendedLevel} (相容)`;
    } else {
      return `推薦 Lv.${recommendedLevel} (最佳組合)`;
    }
  }

  /**
   * 選擇技能
   */
  selectSkill(skill) {
    if (this.isSkillSelected(skill.id)) return;

    if (this.selectedSkills.length >= 3) {
      this.showMessage("最多只能選擇3個技能", "error");
      return;
    }

    const isCompatible = this.isSkillCompatible(skill.id);
    let level;

    if (isCompatible) {
      // Use recommended level for compatible skills
      level = window.CharmSuggestion.getRecommendedLevel(skill.id, this.selectedSkills);
    } else {
      // For incompatible skills, use max level to allow user to create an invalid combo for later analysis
      level = window.CharmData.getMaxSkillLevel(skill.id);
      this.showMessage("提示：此技能與目前組合不相容", "warning");
    }

    const skillWithLevel = { ...skill, level };

    this.selectedSkills.push(skillWithLevel);
    this.renderSelectedSkills();
    this.performCalculation();
    this.hideSkillSelector();
  }

  /**
   * 移除技能
   */
  removeSkill(skillId) {
    this.selectedSkills = this.selectedSkills.filter(
      (skill) => skill.id !== skillId
    );
    this.renderSelectedSkills();
    this.performCalculation();
  }

  /**
   * 增加技能等級
   */
  increaseSkillLevel(skillId) {
    const skill = this.selectedSkills.find((s) => s.id === skillId);
    if (!skill) return;

    const maxLevel = window.CharmData.getMaxSkillLevel(skillId);
    if (skill.level < maxLevel) {
      skill.level++;
      this.renderSelectedSkills();
      this.performCalculation();
    }
  }

  /**
   * 減少技能等級
   */
  decreaseSkillLevel(skillId) {
    const skill = this.selectedSkills.find((s) => s.id === skillId);
    if (!skill) return;

    if (skill.level > 1) {
      skill.level--;
      this.renderSelectedSkills();
      this.performCalculation();
    }
  }

  /**
   * 設定技能等級
   */
  setSkillLevel(skillId, level) {
    const skill = this.selectedSkills.find((s) => s.id === skillId);
    if (!skill) return;

    const maxLevel = window.CharmData.getMaxSkillLevel(skillId);
    if (level >= 1 && level <= maxLevel) {
      skill.level = level;
      this.renderSelectedSkills();
      this.performCalculation();
    }
  }

  /**
   * 渲染已選擇的技能
   */
  renderSelectedSkills() {
    const skillsList = document.getElementById("selectedSkillsList");
    if (!skillsList) return;

    // 清空現有內容，但保留新增按鈕
    skillsList.innerHTML = "";

    // 渲染選擇的技能
    this.selectedSkills.forEach((skill) => {
      const skillItem = this.createSelectedSkillItem(skill);
      skillsList.appendChild(skillItem);
    });

    // 添加新增技能按鈕
    const addButton = document.createElement("div");
    addButton.className = "add-skill-button";
    addButton.innerHTML = `
            <button class="add-button" onclick="showSkillSelector()">
                <span class="plus-icon">+</span>
            </button>
        `;
    skillsList.appendChild(addButton);
  }

  /**
   * 創建已選擇技能項目
   */
  createSelectedSkillItem(skill) {
    const maxLevel = window.CharmData.getMaxSkillLevel(skill.id);

    const item = document.createElement("div");
    item.className = "skill-item";

    item.innerHTML = `
            <img src="./public/imgs/${skill.color}.png" alt="${
      skill.nameZh
    }" class="skill-icon" />
            <div class="skill-info">
                <div class="skill-header">
                    <span class="skill-name">${skill.nameZh}</span>
                </div>
                <div class="skill-dots" onmouseleave="clearSkillHover('${
                  skill.id
                }')">
                    ${Array.from({ length: maxLevel }, (_, i) => {
                      const level = i + 1;
                      const isActive = level <= (skill.level || 1);
                      return `<span class="dot ${isActive ? "active" : ""}" 
                                     onclick="window.charmUI.setSkillLevel('${
                                       skill.id
                                     }', ${level})"
                                     onmouseenter="setSkillHover('${
                                       skill.id
                                     }', ${level})"></span>`;
                    }).join("")}
                </div>
                <span class="skill-level">Lv.${skill.level || 1}</span>
            </div>
            <button onclick="window.charmUI.removeSkill('${
              skill.id
            }')" class="delete-skill">
                <img src="./public/imgs/trash.png" alt="刪除" class="trash-icon" />
            </button>
        `;

    return item;
  }

  /**
   * 執行計算
   */
  async performCalculation() {
    if (this.isCalculating) return;

    // 準備計算條件
    const criteria = {
      targetSkills: this.selectedSkills
        .filter((skill) => skill.level && skill.level > 0)
        .map((skill) => ({ skillId: skill.id, level: skill.level })),
      targetSlots: this.charmSlots.filter((slot) => slot !== 0),
      minRarity: "R5",
      maxRarity: "R8",
    };

    // 如果沒有設定任何條件，顯示空狀態
    if (
      criteria.targetSkills.length === 0 &&
      criteria.targetSlots.length === 0
    ) {
      this.renderEmptyState();
      return;
    }

    this.isCalculating = true;
    this.renderLoadingState();

    try {
      // 執行計算
      const results =
        window.CharmCalculator.calculateCharmProbability(criteria);
      this.calculationResults = results.slice(0, 10); // 只顯示前10個結果

      if (results.length === 0) {
        // 沒有結果，進行失敗分析
        this.failureAnalysis = window.CharmCalculator.analyzeFailure(criteria);
        this.timeEstimation = null;
        this.renderNoResults();
      } else {
        // 有結果，計算時間預估
        this.failureAnalysis = null;
        const totalProbability = results.reduce(
          (sum, result) => sum + result.totalProbability,
          0
        );
        this.timeEstimation = window.CharmCalculator.calculateExpectedTime(
          totalProbability,
          2
        );
        this.renderResults();
      }

      // 更新圖表
      this.updateChart();
    } catch (error) {
      console.error("計算失敗:", error);
      this.renderError("計算過程中發生錯誤，請稍後再試");
    } finally {
      this.isCalculating = false;
    }
  }

  /**
   * 渲染空狀態
   */
  renderEmptyState() {
    const resultsContent = document.getElementById("resultsContent");
    if (!resultsContent) return;

    resultsContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-text">請選擇技能或設定鑲嵌槽來開始計算</div>
            </div>
        `;
  }

  /**
   * 渲染載入狀態
   */
  renderLoadingState() {
    const resultsContent = document.getElementById("resultsContent");
    if (!resultsContent) return;

    resultsContent.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <div class="loading-text">計算中...</div>
            </div>
        `;
  }

  /**
   * 渲染無結果狀態
   */
  renderNoResults() {
    const resultsContent = document.getElementById("resultsContent");
    if (!resultsContent) return;

    let html = `
            <div class="no-results">
                <div class="no-results-container">
                    <div class="no-results-text">
                        喔ㄛ。這裡什麼都沒有。
                        <button class="details-toggle" onclick="window.charmUI.toggleFailureDetails()">
                            (${
                              this.showFailureDetails
                                ? "隱藏詳細資料"
                                : "顯示詳細資料"
                            })
                        </button>
                    </div>
                    <div class="no-results-illustration">
                        <img src="./public/imgs/404.png" alt="No results" class="no-results-image" />
                    </div>
        `;

    if (this.failureAnalysis && this.showFailureDetails) {
      html += this.renderFailureAnalysis();
    }

    html += `
                </div>
            </div>
        `;

    resultsContent.innerHTML = html;
  }

  /**
   * 渲染失敗分析
   */
  renderFailureAnalysis() {
    if (!this.failureAnalysis) return "";

    let html = `
            <div class="failure-analysis">
                <h3 class="analysis-title">失敗原因分析</h3>
        `;

    // 問題原因
    if (this.failureAnalysis.reasons.length > 0) {
      html += `
                <div class="analysis-section">
                    <h4 class="analysis-subtitle">問題原因</h4>
                    <ul class="analysis-list">
                        ${this.failureAnalysis.reasons
                          .map(
                            (reason) =>
                              `<li class="analysis-item error">${reason}</li>`
                          )
                          .join("")}
                    </ul>
                </div>
            `;
    }

    // 建議解決方案
    if (this.failureAnalysis.suggestions.length > 0) {
      html += `
                <div class="analysis-section">
                    <h4 class="analysis-subtitle">建議解決方案</h4>
                    <ul class="analysis-list">
                        ${this.failureAnalysis.suggestions
                          .map(
                            (suggestion) =>
                              `<li class="analysis-item suggestion">${suggestion}</li>`
                          )
                          .join("")}
                    </ul>
                </div>
            `;
    }

    html += "</div>";
    return html;
  }

  /**
   * 切換失敗詳情顯示
   */
  toggleFailureDetails() {
    this.showFailureDetails = !this.showFailureDetails;
    this.renderNoResults();
  }

  /**
   * 渲染計算結果
   */
  renderResults() {
    const resultsContent = document.getElementById("resultsContent");
    if (!resultsContent) return;

    let html = `
            <div class="results-found">
                <div class="result-header">
                    <div class="result-text">
                        好消息，這樣的組合是存在的！<br />
        `;

    if (this.timeEstimation) {
      html += `
                        <span>
                            根據計算，你平均要等待
                            <span>${this.boldDigits(
                              window.CharmCalculator.formatTimeEstimation(
                                this.timeEstimation
                              )
                            )}</span>
                            才能鑑定到這樣一顆護石，期望值為
                            <strong>${
                              this.timeEstimation.expectedAppraisals
                            }</strong>次
                        </span>
            `;
    }

    html += `
                        <br />以下是符合條件的護石：
                    </div>
                    <div class="share-section">
                        <button class="share-button" onclick="showShareModal()">
                            <svg class="share-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 16.08C17.24 16.08 16.56 16.38 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12C9 11.76 8.96 11.53 8.91 11.3L15.96 7.19C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5C21 3.34 19.66 2 18 2C16.34 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.81C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12C3 13.66 4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.19L15.16 18.34C15.11 18.55 15.08 18.77 15.08 19C15.08 20.61 16.39 21.92 18 21.92C19.61 21.92 20.92 20.61 20.92 19C20.92 17.39 19.61 16.08 18 16.08Z" fill="currentColor"/>
                            </svg>
                            分享結果
                        </button>
                    </div>
                </div>
                <div class="result-items">
        `;

    // 渲染結果項目
    this.calculationResults.forEach((result, index) => {
      html += this.renderResultCard(result, index);
    });

    html += `
                </div>
            </div>
        `;

    resultsContent.innerHTML = html;
  }

  /**
   * 渲染結果卡片
   */
  renderResultCard(result, index) {
    const skillTags = result.detailedSkills
      ? result.detailedSkills
          .map((skill) => `${skill.nameZh}${skill.level}`)
          .join("、")
      : "";

    return `
            <div class="result-card">
                <div class="card-header">
                    <div class="template-info">
                        ${
                          result.detailedSkills &&
                          result.detailedSkills.length > 0
                            ? `<img src="./public/imgs/${result.detailedSkills[0].color}.png" alt="${result.detailedSkills[0].nameZh}" class="template-icon" />`
                            : `<img src="./public/imgs/placeholder_icon.png" alt="護石" class="template-icon" />`
                        }
                        <div class="template-details">
                            <div class="template-name">${result.rarity} ${
      result.template.labelZh
    }</div>
                            <div class="template-skills">
                                ${
                                  result.detailedSkills
                                    ? result.detailedSkills
                                        .map(
                                          (skill) =>
                                            `<div class="skill-tag">${skill.nameZh}${skill.level}</div>`
                                        )
                                        .join("")
                                    : ""
                                }
                            </div>
                        </div>
                    </div>
                    <div class="slot-display">
                        ${window.CharmCalculator.formatSlotPattern(
                          result.slotPattern
                        )}
                    </div>
                </div>
                <div class="card-footer">
                    <div class="total-probability">
                        ${window.CharmCalculator.formatProbability(
                          result.totalProbability
                        )}
                    </div>
                    ${
                      result.calculationDetails
                        ? this.renderCalculationDetails(
                            result.calculationDetails
                          )
                        : ""
                    }
                </div>
            </div>
        `;
  }

  /**
   * 渲染計算詳情
   */
  renderCalculationDetails(details) {
    return `
            <div class="detailed-breakdown">
                <div class="breakdown-row">
                    <span class="label">稀有度機率:</span>
                    <span class="value">${window.CharmCalculator.formatProbability(
                      details.rarityWeight
                    )}</span>
                </div>
                <div class="breakdown-row">
                    <span class="label">模板機率:</span>
                    <span class="value">${window.CharmCalculator.formatProbability(
                      details.templateWeight
                    )}</span>
                </div>
                <div class="breakdown-row">
                    <span class="label">技能機率:</span>
                    <span class="value">${window.CharmCalculator.formatProbability(
                      details.skillProbability
                    )}</span>
                </div>
                <div class="breakdown-row">
                    <span class="label">槽位機率:</span>
                    <span class="value">${window.CharmCalculator.formatProbability(
                      details.slotProbability
                    )}</span>
                </div>
                <div class="breakdown-row">
                    <span class="label">組合數:</span>
                    <span class="value">${details.possibleCombinations}</span>
                </div>
            </div>
        `;
  }

  /**
   * 渲染錯誤狀態
   */
  renderError(message) {
    const resultsContent = document.getElementById("resultsContent");
    if (!resultsContent) return;

    resultsContent.innerHTML = `
            <div class="error-state">
                <div class="error-text">${message}</div>
            </div>
        `;
  }

  /**
   * 讓數字變粗體
   */
  boldDigits(text) {
    if (!text) return "";
    return text.replace(/(\d+)/g, "<strong>$1</strong>");
  }

  /**
   * 過濾技能
   */
  filterSkills() {
    const searchInput = document.getElementById("skillSearch");
    if (searchInput) {
      this.searchQuery = searchInput.value;
      this.renderSkills();
    }
  }

  /**
   * 顯示消息
   */
  showMessage(message, type = "info") {
    // 可以實現一個通知系統
    console.log(`${type}: ${message}`);
  }

  /**
   * 隱藏技能選擇器
   */
  hideSkillSelector() {
    const modal = document.getElementById("skillSelectorModal");
    if (modal) {
      modal.style.display = "none";
    }
  }

  // 圖表相關方法
  updateChart() {
    if (!this.chartCanvas) return;

    if (this.calculationResults.length === 0) {
      this.chartData = [];
    } else {
      this.chartData = this.prepareDistributionData();
    }

    const ctx = this.chartCanvas.getContext("2d");
    if (ctx) {
      this.drawChart(ctx);
    }
  }

  prepareDistributionData() {
    if (this.calculationResults.length === 0) return [];

    const totalProbability = this.calculationResults.reduce(
      (sum, result) => sum + result.totalProbability,
      0
    );

    if (totalProbability === 0) return [];

    const expectedTime = window.CharmCalculator.calculateExpectedTime(
      totalProbability,
      2
    );
    const meanMinutes = expectedTime.totalMinutes;
    const stdDev = Math.max(meanMinutes * 0.3, 30);

    const points = [];
    const minTime = 10;
    const maxTime = meanMinutes + 4 * stdDev;
    const stepSize = (maxTime - minTime) / 200;

    for (let t = minTime; t <= maxTime; t += stepSize) {
      const probability = this.normalPDF(t, meanMinutes, stdDev);
      points.push({
        time: t,
        probability: probability,
        timeLabel: this.formatTimeLabel(t),
      });
    }

    return points;
  }

  normalPDF(x, mean, stdDev) {
    const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
    return coefficient * Math.exp(exponent);
  }

  formatTimeLabel(minutes) {
    if (minutes < 60) {
      return `${Math.round(minutes)}分`;
    } else if (minutes < 1440) {
      const hours = Math.round(minutes / 60);
      return `${hours}時`;
    } else {
      const days = Math.round(minutes / 1440);
      return `${days}天`;
    }
  }

  drawChart(ctx) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const padding = 60;

    // 清空畫布
    ctx.clearRect(0, 0, width, height);

    // 背景
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);

    if (this.chartData.length === 0) {
      // 空狀態
      ctx.fillStyle = "#666";
      ctx.font = '16px "Noto Sans TC", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("請選擇技能來查看數據分析", width / 2, height / 2);
      return;
    }

    this.drawDistributionChart(
      ctx,
      width - 2 * padding,
      height - 2 * padding,
      padding
    );

    // 標題
    ctx.fillStyle = "#999999";
    ctx.font = 'bold 18px "Noto Sans TC", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("護石獲得時間分布（常態分佈）", width / 2, 30);
  }

  drawDistributionChart(ctx, chartWidth, chartHeight, padding) {
    if (this.chartData.length === 0) return;

    const points = this.chartData;
    const maxProbability = Math.max(...points.map((p) => p.probability));
    const minTime = Math.min(...points.map((p) => p.time));
    const maxTime = Math.max(...points.map((p) => p.time));

    // 繪製曲線
    ctx.strokeStyle = "#777777";
    ctx.fillStyle = "rgba(119, 119, 119, 0.2)";
    ctx.lineWidth = 3;

    // 創建路徑
    ctx.beginPath();
    const startX = padding;
    const startY = padding + chartHeight;
    ctx.moveTo(startX, startY);

    points.forEach((point, index) => {
      const x =
        padding + ((point.time - minTime) / (maxTime - minTime)) * chartWidth;
      const y =
        padding +
        chartHeight -
        (point.probability / maxProbability) * chartHeight;

      if (index === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // 填充曲線下方
    const endX = padding + chartWidth;
    const endY = padding + chartHeight;
    ctx.lineTo(endX, endY);
    ctx.lineTo(startX, startY);
    ctx.closePath();
    ctx.fill();

    // 繪製曲線
    ctx.beginPath();
    points.forEach((point, index) => {
      const x =
        padding + ((point.time - minTime) / (maxTime - minTime)) * chartWidth;
      const y =
        padding +
        chartHeight -
        (point.probability / maxProbability) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // 繪製坐標軸
    this.drawTimeAxes(ctx, chartWidth, chartHeight, padding, minTime, maxTime);
  }

  drawTimeAxes(ctx, chartWidth, chartHeight, padding, minTime, maxTime) {
    // 坐標軸
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;

    // X軸
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();

    // Y軸
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.stroke();

    // X軸標籤
    ctx.fillStyle = "#ccc";
    ctx.font = '10px "Noto Sans TC", sans-serif';
    ctx.textAlign = "center";

    const timeSteps = 6;
    for (let i = 0; i <= timeSteps; i++) {
      const time = minTime + (maxTime - minTime) * (i / timeSteps);
      const x = padding + (i / timeSteps) * chartWidth;
      const timeLabel = this.formatTimeLabel(time);

      // 刻度
      ctx.strokeStyle = "#444";
      ctx.beginPath();
      ctx.moveTo(x, padding + chartHeight);
      ctx.lineTo(x, padding + chartHeight + 5);
      ctx.stroke();

      // 標籤
      ctx.fillText(timeLabel, x, padding + chartHeight + 18);
    }

    // Y軸標籤
    ctx.save();
    ctx.translate(20, padding + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#ccc";
    ctx.font = '12px "Noto Sans TC", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("機率密度", 0, 0);
    ctx.restore();

    // X軸標籤
    ctx.fillStyle = "#ccc";
    ctx.font = '12px "Noto Sans TC", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("時間", padding + chartWidth / 2, padding + chartHeight + 40);
  }

  onChartMouseMove(event) {
    // 圖表滑鼠移動事件處理
    // 可以實現工具提示等功能
  }

  onChartMouseLeave() {
    // 圖表滑鼠離開事件處理
    this.chartHoverX = -1;
    if (this.chartCanvas) {
      const ctx = this.chartCanvas.getContext("2d");
      if (ctx) {
        this.drawChart(ctx);
      }
    }
  }
}

// 創建全域實例
const charmUI = new CharmUI();
window.charmUI = charmUI;

// 全域函數
window.showSkillSelector = function () {
  const modal = document.getElementById("skillSelectorModal");
  if (modal) {
    modal.style.display = "flex";
    charmUI.renderSkills();
  }
};

window.hideSkillSelector = function (event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById("skillSelectorModal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.filterSkills = function () {
  charmUI.filterSkills();
};

window.showShareModal = function () {
  const modal = document.getElementById("shareModal");
  if (modal) {
    modal.style.display = "flex";
  }
};

window.hideShareModal = function (event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById("shareModal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.saveAsImage = function () {
  charmUI.showMessage("圖片儲存功能開發中...", "info");
};

window.copyResultText = function () {
  charmUI.showMessage("文字複製功能開發中...", "info");
};

window.setSkillHover = function (skillId, level) {
  charmUI.skillHoverLevels[skillId] = level;
};

window.clearSkillHover = function (skillId) {
  charmUI.skillHoverLevels[skillId] = 0;
};

window.openYoutube = function () {
  window.open("https://www.youtube.com/@bmonlive?sub_confirmation=1", "_blank");
};

window.openStar = function () {
  window.open("https://github.com/sam3u7858/wilds", "_blank");
};

window.toggleUserDropdown = function () {
  // 用戶下拉菜單功能
  console.log("用戶下拉菜單功能開發中...");
};
