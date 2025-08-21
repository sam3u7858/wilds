/**
 * 技能建議與分析模組
 */
class CharmSuggestion {
  constructor() {
    this.dataManager = window.CharmData;
  }

  /**
   * 獲取技能的推薦等級
   * @param {string} skillId - 技能ID
   * @param {Array} selectedSkills - 當前已選擇的技能列表
   * @returns {number} 推薦的等級，-1 表示不相容
   */
  getRecommendedLevel(skillId, selectedSkills) {
    const rarities = this.dataManager.getRarities();
    if (!rarities) return 1;

    // 獲取當前已選技能（排除正在考慮的技能）
    const currentSkills = selectedSkills.filter(
      (skill) => skill.id !== skillId
    );

    if (currentSkills.length === 0) {
      return this.dataManager.getMaxSkillLevel(skillId);
    }

    // 分析與當前技能組合相容的最佳等級
    return this.getBestCompatibleLevel(skillId, currentSkills);
  }

  /**
   * 根據當前技能組合分析最佳相容等級
   * @param {string} skillId - 技能ID
   * @param {Array} currentSkills - 當前已選擇的技能列表
   * @returns {number} 最佳相容等級，-1 表示不相容
   */
  getBestCompatibleLevel(skillId, currentSkills) {
    const rarities = this.dataManager.getRarities();
    if (!rarities) return 1;

    const availableLevels = this.dataManager.getAvailableSkillLevels(skillId);

    // 從最高等級開始測試，找到第一個相容的等級
    for (let level of [...availableLevels].sort((a, b) => b - a)) {
      const testSkills = [...currentSkills, { id: skillId, level }];
      if (this.isSkillCombinationValid(testSkills)) {
        return level;
      }
    }

    // 如果沒有相容的等級，返回 -1
    return -1;
  }

  /**
   * 檢查技能組合是否在任何護石模板中有效
   * @param {Array} testSkills - 待測試的技能組合
   * @returns {boolean} 是否有效
   */
  isSkillCombinationValid(testSkills) {
    const rarities = this.dataManager.getRarities();
    const skillGroups = this.dataManager.getSkillGroups();
    if (!rarities || !skillGroups || testSkills.length === 0) return true;

    if (testSkills.length > 3) return false;

    // 轉換為計算器所需的格式
    const targetSkills = testSkills.map((skill) => ({
      skillId: skill.id,
      level: skill.level || 1,
    }));

    return this.checkTemplateCompatibility(targetSkills);
  }

  /**
   * 檢查護石模板相容性
   * @param {Array} targetSkills - 目標技能列表
   * @returns {boolean} 是否有相容模板
   */
  checkTemplateCompatibility(targetSkills) {
    const rarities = this.dataManager.getRarities();
    const skillGroups = this.dataManager.getSkillGroups();
    if (!rarities || !skillGroups) return false;

    for (const [, rarityData] of Object.entries(rarities.rarities)) {
      for (const template of rarityData.templates) {
        if (this.canTemplateAccommodateSkills(template, targetSkills)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 檢查特定模板是否能容納技能組合
   * @param {object} template - 護石模板
   * @param {Array} targetSkills - 目標技能列表
   * @returns {boolean} 是否能容納
   */
  canTemplateAccommodateSkills(template, targetSkills) {
    const skillGroups = this.dataManager.getSkillGroups();
    if (!skillGroups) return false;

    if (targetSkills.length > template.skillGroups.length) {
      return false;
    }

    return this.findSkillAssignment(
      template.skillGroups,
      targetSkills,
      0,
      new Set()
    );
  }

  /**
   * 遞歸檢查技能分配可能性
   * @param {Array} templateGroups - 模板的技能群組
   * @param {Array} targetSkills - 目標技能列表
   * @param {number} skillIndex - 當前技能索引
   * @param {Set} usedGroupIndices - 已使用的群組索引
   * @returns {boolean} 是否能成功分配
   */
  findSkillAssignment(
    templateGroups,
    targetSkills,
    skillIndex,
    usedGroupIndices
  ) {
    const skillGroups = this.dataManager.getSkillGroups();
    if (!skillGroups) return false;

    if (skillIndex >= targetSkills.length) {
      return true;
    }

    const targetSkill = targetSkills[skillIndex];

    for (let groupIndex = 0; groupIndex < templateGroups.length; groupIndex++) {
      if (usedGroupIndices.has(groupIndex)) continue;

      const templateGroup = templateGroups[groupIndex];
      const group = skillGroups.groups.find(
        (g) => g.groupId === templateGroup.groupId
      );

      if (group) {
        const hasSkill = group.entries.some(
          (entry) =>
            entry.skillId === targetSkill.skillId &&
            entry.level === targetSkill.level
        );

        if (hasSkill) {
          usedGroupIndices.add(groupIndex);
          if (
            this.findSkillAssignment(
              templateGroups,
              targetSkills,
              skillIndex + 1,
              usedGroupIndices
            )
          ) {
            return true;
          }
          usedGroupIndices.delete(groupIndex); // Backtrack
        }
      }
    }

    return false;
  }

  /**
   * Checks if lowering the level of an already selected skill can make a new skill compatible.
   * This is triggered when one skill is already selected and the user hovers/selects a second one.
   * @param {string} newSkillId - The ID of the skill to be added.
   * @param {Array} selectedSkills - The list of currently selected skills. Should contain exactly one skill.
   * @returns {object} An object with suggestion details or adjustment: false.
   */
  findLevelAdjustmentSuggestion(newSkillId, selectedSkills) {
    if (selectedSkills.length !== 1) {
      return { adjustment: false };
    }

    const originalSkill = selectedSkills[0];

    // First, check if it's compatible without any adjustments
    const recommendedLevel = this.getBestCompatibleLevel(
      newSkillId,
      selectedSkills
    );
    if (recommendedLevel > -1) {
      return { adjustment: false };
    }

    // If not compatible, try lowering the original skill's level by one RANK
    const availableLevels = this.dataManager
      .getAvailableSkillLevels(originalSkill.id)
      .sort((a, b) => a - b);
    const currentLevelIndex = availableLevels.indexOf(originalSkill.level);

    if (currentLevelIndex <= 0) {
      return { adjustment: false }; // Already at the lowest level or level not found
    }

    const adjustedOriginalLevel = availableLevels[currentLevelIndex - 1];
    const adjustedOriginalSkill = {
      ...originalSkill,
      level: adjustedOriginalLevel,
    };

    const newSkillRecommendedLevel = this.getBestCompatibleLevel(newSkillId, [
      adjustedOriginalSkill,
    ]);

    if (newSkillRecommendedLevel > -1) {
      return {
        adjustment: true,
        originalSkillId: originalSkill.id,
        originalSkillName:
          this.dataManager.getSkillById(originalSkill.id)?.nameZh ||
          originalSkill.id,
        newLevel: adjustedOriginalLevel,
        newSkillLevel: newSkillRecommendedLevel,
      };
    }

    return { adjustment: false };
  }

  /**
   * 分析計算失敗原因
   * @param {object} criteria - 使用者設定的計算條件
   * @returns {object} 包含原因和建議的分析結果
   */
  analyzeFailure(criteria) {
    const rarities = this.dataManager.getRarities();
    const skillGroups = this.dataManager.getSkillGroups();
    const skills = this.dataManager.getSkills();
    const skillMap = new Map(skills.map((s) => [s.id, s]));

    const analysis = {
      reasons: [],
      suggestions: [],
    };

    // 1. 檢查技能等級是否超過最大值
    criteria.targetSkills.forEach((targetSkill) => {
      const maxLevel = this.dataManager.getMaxSkillLevel(targetSkill.skillId);
      if (targetSkill.level > maxLevel) {
        const skillName =
          skillMap.get(targetSkill.skillId)?.nameZh || targetSkill.skillId;
        analysis.reasons.push(
          `技能 ${skillName} 的等級 ${targetSkill.level} 超過遊戲中最大等級 ${maxLevel}。`
        );
        analysis.suggestions.push(
          ` • 將 ${skillName} 的等級降低到 ${maxLevel} 或以下。`
        );
      }
    });

    // 2. 檢查整體模板相容性
    const isCombinationPossible = this.checkTemplateCompatibility(
      criteria.targetSkills
    );

    if (!isCombinationPossible && criteria.targetSkills.length > 0) {
      analysis.reasons.push("您選擇的技能組合在任何已知的護石模板中都不存在。");
      analysis.suggestions.push("請考慮以下替代方案：");

      // 建議1: 單獨尋找技能
      if (criteria.targetSkills.length > 1) {
        criteria.targetSkills.forEach((skill) => {
          const skillName =
            skillMap.get(skill.skillId)?.nameZh || skill.skillId;
          analysis.suggestions.push(
            ` • 單獨尋找包含 ${skillName} Lv.${skill.level} 的護石。`
          );
        });
      }

      // 建議2: 嘗試降低技能等級
      criteria.targetSkills.forEach((targetSkill) => {
        const skillName =
          skillMap.get(targetSkill.skillId)?.nameZh || targetSkill.skillId;
        const currentLevel = targetSkill.level;

        // 嘗試從-1等級開始找到一個可行的組合
        for (let level = currentLevel - 1; level >= 1; level--) {
          const otherSkills = criteria.targetSkills.filter(
            (s) => s.skillId !== targetSkill.skillId
          );
          const testSkills = [
            ...otherSkills,
            { skillId: targetSkill.skillId, level: level },
          ];

          if (this.checkTemplateCompatibility(testSkills)) {
            analysis.suggestions.push(
              ` • 嘗試將 ${skillName} 的等級降低到 Lv.${level}。`
            );
            return; // 找到一個建議就夠了
          }
        }
      });
    }

    // 如果有原因但沒有建議，給一個通用建議
    if (analysis.reasons.length > 0 && analysis.suggestions.length === 0) {
      analysis.suggestions.push("請嘗試調整技能組合或降低技能等級。");
    }

    return analysis;
  }
}

// 創建全域實例
const charmSuggestion = new CharmSuggestion();
window.CharmSuggestion = charmSuggestion;
