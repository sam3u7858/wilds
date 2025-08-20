/**
 * 護石計算器核心邏輯模組
 */

class CharmCalculator {
  constructor() {
    this.dataManager = window.CharmData;
  }

  /**
   * 計算符合條件的護石機率 - 反推算法
   */
  calculateCharmProbability(criteria) {
    const rarities = this.dataManager.getRarities();
    const skillGroups = this.dataManager.getSkillGroups();
    const skills = this.dataManager.getSkills();

    if (!rarities || !skillGroups || !skills) {
      return [];
    }

    const results = [];
    const skillMap = new Map(skills.map((skill) => [skill.id, skill]));

    // 遍歷所有稀有度
    Object.entries(rarities.rarities).forEach(([rarity, rarityData]) => {
      // 檢查稀有度範圍
      if (criteria.minRarity && rarity < criteria.minRarity) return;
      if (criteria.maxRarity && rarity > criteria.maxRarity) return;

      // 遍歷該稀有度的所有模板
      rarityData.templates.forEach((template) => {
        // 檢查此模板是否能產生目標技能組合
        const templateResults = this.calculateTemplateMatches(
          template,
          skillGroups,
          skillMap,
          criteria.targetSkills,
          criteria.targetSlots,
          rarityData.weight,
          rarityData.templates.length,
          rarity
        );

        results.push(...templateResults);
      });
    });

    // 按機率排序（高到低）
    return results.sort((a, b) => b.totalProbability - a.totalProbability);
  }

  /**
   * 計算單個模板的匹配結果
   */
  calculateTemplateMatches(
    template,
    skillGroups,
    skillMap,
    targetSkills,
    targetSlots,
    rarityWeight,
    totalTemplatesInRarity,
    rarity
  ) {
    const results = [];

    // 檢查鑲嵌槽匹配
    template.slotPatterns.forEach((slotPattern) => {
      if (!this.matchesSlotCriteria(slotPattern, targetSlots)) {
        return;
      }

      // 計算技能組合機率
      const skillProbability = this.calculateSkillCombinationProbability(
        template,
        skillGroups,
        targetSkills
      );

      if (skillProbability > 0) {
        // 計算模板權重（假設同一稀有度下所有模板等權重）
        const templateWeight = 1 / totalTemplatesInRarity;

        // 計算鑲嵌槽機率
        const slotProbability =
          slotPattern.weight /
          template.slotPatterns.reduce((sum, sp) => sum + sp.weight, 0);

        // 總機率 = 稀有度機率 × 模板權重 × 模板技能機率 × 鑲嵌槽機率
        const totalProbability =
          rarityWeight * templateWeight * skillProbability * slotProbability;

        results.push({
          template,
          rarity,
          probability: skillProbability,
          slotPattern,
          totalProbability,
          detailedSkills: targetSkills.map((ts) => ({
            ...skillMap.get(ts.skillId),
            level: ts.level,
          })),
          calculationDetails: {
            rarityWeight,
            templateWeight,
            skillProbability,
            slotProbability,
            totalProbability,
            possibleCombinations: this.findSkillGroupCombinations(
              template.skillGroups,
              skillGroups,
              targetSkills
            ).length,
          },
        });
      }
    });

    return results;
  }

  /**
   * 計算技能組合的生成機率
   */
  calculateSkillCombinationProbability(template, skillGroups, targetSkills) {
    // 檢查模板是否有足夠的技能槽位
    if (targetSkills.length > template.skillGroups.length) {
      return 0;
    }

    // 找到所有可能的技能群組組合
    const possibleCombinations = this.findSkillGroupCombinations(
      template.skillGroups,
      skillGroups,
      targetSkills
    );

    if (possibleCombinations.length === 0) {
      return 0;
    }

    // 計算每個組合的機率並求和
    let totalProbability = 0;

    possibleCombinations.forEach((combination) => {
      const combinationProbability = this.calculateCombinationProbability(
        combination,
        skillGroups,
        targetSkills
      );
      totalProbability += combinationProbability;
    });

    return totalProbability;
  }

  /**
   * 找到所有可能產生目標技能的技能群組組合
   */
  findSkillGroupCombinations(templateGroups, skillGroups, targetSkills) {
    const combinations = [];

    // 使用遞歸回溯算法找到所有可能的分配
    const backtrack = (skillIndex, currentAssignment, usedGroupIndices) => {
      if (skillIndex === targetSkills.length) {
        combinations.push({ groupAssignments: [...currentAssignment] });
        return;
      }

      const currentSkill = targetSkills[skillIndex];

      // 嘗試每個可用的技能群組（按索引）
      templateGroups.forEach((templateGroup, groupIndex) => {
        if (usedGroupIndices.has(groupIndex)) return;

        const group = skillGroups.groups.find(
          (g) => g.groupId === templateGroup.groupId
        );
        if (!group) return;

        // 檢查這個群組是否包含當前目標技能
        const hasSkill = group.entries.some(
          (entry) =>
            entry.skillId === currentSkill.skillId &&
            entry.level === currentSkill.level
        );

        if (hasSkill) {
          currentAssignment.push({
            groupIndex,
            groupId: templateGroup.groupId,
            targetSkill: currentSkill,
          });
          usedGroupIndices.add(groupIndex);

          backtrack(skillIndex + 1, currentAssignment, usedGroupIndices);

          currentAssignment.pop();
          usedGroupIndices.delete(groupIndex);
        }
      });
    };

    backtrack(0, [], new Set());
    return combinations;
  }

  /**
   * 計算特定組合的機率
   */
  calculateCombinationProbability(combination, skillGroups, targetSkills) {
    let probability = 1;

    combination.groupAssignments.forEach((assignment) => {
      const group = skillGroups.groups.find(
        (g) => g.groupId === assignment.groupId
      );
      if (!group) return 0;

      // 找到目標技能在群組中的條目
      const targetEntry = group.entries.find(
        (entry) =>
          entry.skillId === assignment.targetSkill.skillId &&
          entry.level === assignment.targetSkill.level
      );

      if (!targetEntry) return 0;

      // 計算從這個群組抽到目標技能的機率
      const totalWeight = group.entries.reduce(
        (sum, entry) => sum + entry.weight,
        0
      );
      const skillProbability = targetEntry.weight / totalWeight;

      probability *= skillProbability;
    });

    return probability;
  }

  /**
   * 檢查鑲嵌槽是否符合條件
   */
  matchesSlotCriteria(slotPattern, targetSlots) {
    if (targetSlots.length === 0) return true;

    // 直接使用數據中的 slots 陣列
    const patternSlots = [...slotPattern.slots];

    // 排序以便比較
    const sortedPatternSlots = [...patternSlots].sort((a, b) => {
      if (a === -1) return -1; // 武器槽排在前面
      if (b === -1) return 1;
      return b - a; // 其他槽位從大到小
    });

    const sortedTargetSlots = [...targetSlots].sort((a, b) => {
      if (a === -1) return -1; // W1 用 -1 表示
      if (b === -1) return 1;
      return b - a;
    });

    // 檢查是否完全匹配
    if (sortedPatternSlots.length !== sortedTargetSlots.length) {
      return false;
    }

    return sortedTargetSlots.every((targetSlot, index) => {
      return sortedPatternSlots[index] === targetSlot;
    });
  }

  /**
   * 格式化機率顯示
   */
  formatProbability(probability) {
    if (probability < 0.000001) {
      return `${(probability * 100).toFixed(8)}%`;
    }
    if (probability < 0.0001) {
      return `${(probability * 100).toFixed(6)}%`;
    }
    if (probability < 0.01) {
      return `${(probability * 100).toFixed(4)}%`;
    }
    return `${(probability * 100).toFixed(2)}%`;
  }

  /**
   * 格式化鑲嵌槽顯示
   */
  formatSlotPattern(slotPattern) {
    return slotPattern.slots
      .map((slot) => {
        if (slot === -1) return "[W1]";
        return `[${slot}]`;
      })
      .join("");
  }

  /**
   * 計算預期時間（假設每次鑑定需要一定時間）
   */
  calculateExpectedTime(probability, minutesPerAppraisal = 2) {
    const expectedAppraisals = Math.round(1 / probability);
    const totalMinutes = expectedAppraisals * minutesPerAppraisal;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      expectedAppraisals,
      hours,
      minutes,
      totalMinutes,
    };
  }

  /**
   * 格式化時間顯示
   */
  formatTimeEstimation(estimation) {
    const total = estimation.totalMinutes;
    const days = Math.floor(total / (60 * 24));
    const hours = Math.floor((total % (60 * 24)) / 60);
    const minutes = total % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小時`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}分鐘`);

    if (days > 0 && (hours > 0 || minutes > 0)) {
      return `${parts[0]}又${parts.slice(1).join("")}`;
    }
    return parts.join("");
  }

  /**
   * 分析失敗原因
   */
  analyzeFailure(criteria) {
    const rarities = this.dataManager.getRarities();
    const skillGroups = this.dataManager.getSkillGroups();
    const skills = this.dataManager.getSkills();

    if (!rarities || !skillGroups || !skills) {
      return {
        reasons: ["數據尚未載入完成"],
        suggestions: ["請等待數據載入完成後再試"],
        skillIssues: [],
        slotIssues: {
          requestedSlots: criteria.targetSlots,
          availableSlotPatterns: [],
        },
        compatibilityIssues: {
          hasCompatibleTemplates: false,
          compatibleRarities: [],
          skillSlotMismatch: false,
        },
      };
    }

    const analysis = {
      reasons: [],
      suggestions: [],
      skillIssues: [],
      slotIssues: {
        requestedSlots: criteria.targetSlots,
        availableSlotPatterns: [],
      },
      compatibilityIssues: {
        hasCompatibleTemplates: false,
        compatibleRarities: [],
        skillSlotMismatch: false,
      },
    };

    const skillMap = new Map(skills.map((skill) => [skill.id, skill]));

    // 分析技能問題
    criteria.targetSkills.forEach((targetSkill) => {
      const skill = skillMap.get(targetSkill.skillId);
      if (!skill) {
        analysis.reasons.push(`技能 ${targetSkill.skillId} 不存在`);
        return;
      }

      // 檢查技能在哪些群組中可用，以及最高等級
      const availableGroups = [];
      let maxLevel = 0;

      skillGroups.groups.forEach((group) => {
        const entries = group.entries.filter(
          (entry) => entry.skillId === targetSkill.skillId
        );
        if (entries.length > 0) {
          availableGroups.push(group.labelZh);
          const groupMaxLevel = Math.max(
            ...entries.map((entry) => entry.level)
          );
          maxLevel = Math.max(maxLevel, groupMaxLevel);
        }
      });

      if (availableGroups.length === 0) {
        analysis.reasons.push(`技能 ${skill.nameZh} 在任何技能群組中都不可用`);
      } else if (targetSkill.level > maxLevel) {
        analysis.reasons.push(
          `技能 ${skill.nameZh} 的等級 ${targetSkill.level} 超過最高可用等級 ${maxLevel}`
        );
        analysis.suggestions.push(
          `將 ${skill.nameZh} 的等級降低到 ${maxLevel} 或以下`
        );
      }

      analysis.skillIssues.push({
        skillId: targetSkill.skillId,
        skillName: skill.nameZh,
        level: targetSkill.level,
        availableInGroups: availableGroups,
        maxLevelInGroups: maxLevel,
      });
    });

    // 收集所有可用的槽位模式
    const allSlotPatterns = new Set();
    Object.values(rarities.rarities).forEach((rarityData) => {
      rarityData.templates.forEach((template) => {
        template.slotPatterns.forEach((pattern) => {
          allSlotPatterns.add(this.formatSlotPattern(pattern));
        });
      });
    });
    analysis.slotIssues.availableSlotPatterns = Array.from(allSlotPatterns);

    // 分析相容性問題
    let hasAnyCompatibleTemplate = false;
    const compatibleRarities = new Set();

    Object.entries(rarities.rarities).forEach(([rarity, rarityData]) => {
      let rarityHasCompatibleTemplate = false;

      rarityData.templates.forEach((template) => {
        // 檢查技能相容性
        const skillCompatible =
          criteria.targetSkills.length <= template.skillGroups.length;

        // 檢查槽位相容性
        const slotCompatible = template.slotPatterns.some((pattern) =>
          this.matchesSlotCriteria(pattern, criteria.targetSlots)
        );

        // 檢查技能群組相容性
        const skillGroupCompatible =
          criteria.targetSkills.length === 0 ||
          this.findSkillGroupCombinations(
            template.skillGroups,
            skillGroups,
            criteria.targetSkills
          ).length > 0;

        if (skillCompatible && slotCompatible && skillGroupCompatible) {
          hasAnyCompatibleTemplate = true;
          rarityHasCompatibleTemplate = true;
        }
      });

      if (rarityHasCompatibleTemplate) {
        compatibleRarities.add(rarity);
      }
    });

    analysis.compatibilityIssues.hasCompatibleTemplates =
      hasAnyCompatibleTemplate;
    analysis.compatibilityIssues.compatibleRarities =
      Array.from(compatibleRarities);

    // 生成具體的失敗原因和建議
    if (
      criteria.targetSkills.length === 0 &&
      criteria.targetSlots.length === 0
    ) {
      analysis.reasons.push("沒有設定任何條件");
      analysis.suggestions.push("請選擇技能或設定鑲嵌槽條件");
    }

    if (criteria.targetSkills.length > 3) {
      analysis.reasons.push("技能數量過多，沒有護石模板支援超過 3 個技能");
      analysis.suggestions.push("減少技能數量到 3 個或以下");
    }

    if (criteria.targetSlots.length > 3) {
      analysis.reasons.push("鑲嵌槽數量過多，護石最多只有 3 個槽位");
      analysis.suggestions.push("減少鑲嵌槽數量到 3 個或以下");
    }

    if (compatibleRarities.size > 0) {
      analysis.suggestions.push(
        `嘗試在 ${Array.from(compatibleRarities).join(
          ", "
        )} 稀有度中尋找替代方案`
      );
    }

    return analysis;
  }
}

// 創建全域實例
const charmCalculator = new CharmCalculator();

// 公開API
window.CharmCalculator = {
  calculateCharmProbability: (criteria) =>
    charmCalculator.calculateCharmProbability(criteria),
  formatProbability: (probability) =>
    charmCalculator.formatProbability(probability),
  formatSlotPattern: (slotPattern) =>
    charmCalculator.formatSlotPattern(slotPattern),
  calculateExpectedTime: (probability, minutesPerAppraisal) =>
    charmCalculator.calculateExpectedTime(probability, minutesPerAppraisal),
  formatTimeEstimation: (estimation) =>
    charmCalculator.formatTimeEstimation(estimation),
  analyzeFailure: (criteria) => charmCalculator.analyzeFailure(criteria),
};
