/**
 * 數據管理模組 - 負責載入和管理所有遊戲數據
 */

class CharmDataManager {
  constructor() {
    this.skills = null;
    this.skillGroups = null;
    this.rarities = null;
    this.isLoading = false;
    this.error = null;
    this.loaded = false;
  }

  /**
   * 載入稀有度資料
   */
  async loadRarities() {
    try {
      const response = await fetch("./data/rarities.json");
      if (!response.ok) {
        throw new Error(`Failed to load rarities data: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error loading rarities data:", error);
      throw error;
    }
  }

  /**
   * 載入技能群組資料
   */
  async loadSkillGroups() {
    try {
      const response = await fetch("./data/skill_groups.json");
      if (!response.ok) {
        throw new Error(`Failed to load skill groups data: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error loading skill groups data:", error);
      throw error;
    }
  }

  /**
   * 載入技能資料
   */
  async loadSkills() {
    try {
      const response = await fetch("./data/skills.json");
      if (!response.ok) {
        throw new Error(`Failed to load skills data: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error loading skills data:", error);
      throw error;
    }
  }

  /**
   * 載入所有資料
   */
  async loadAllData() {
    if (this.isLoading) return;
    if (this.loaded)
      return {
        skills: this.skills,
        skillGroups: this.skillGroups,
        rarities: this.rarities,
      };

    this.isLoading = true;
    this.error = null;

    try {
      const [raritiesData, skillGroupsData, skillsData] = await Promise.all([
        this.loadRarities(),
        this.loadSkillGroups(),
        this.loadSkills(),
      ]);

      this.rarities = raritiesData;
      this.skillGroups = skillGroupsData;
      this.skills = skillsData.skills;
      this.loaded = true;

      return {
        skills: this.skills,
        skillGroups: this.skillGroups,
        rarities: this.rarities,
      };
    } catch (err) {
      this.error = err instanceof Error ? err.message : "載入資料失敗";
      console.error("Error loading all data:", err);
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 取得技能資料
   */
  getSkills() {
    return this.skills;
  }

  /**
   * 取得技能群組資料
   */
  getSkillGroups() {
    return this.skillGroups;
  }

  /**
   * 取得稀有度資料
   */
  getRarities() {
    return this.rarities;
  }

  /**
   * 根據技能ID取得技能資料
   */
  getSkillById(skillId) {
    if (!this.skills) return null;
    return this.skills.find((skill) => skill.id === skillId);
  }

  /**
   * 根據群組ID取得技能群組資料
   */
  getSkillGroupById(groupId) {
    if (!this.skillGroups) return null;
    return this.skillGroups.groups.find((group) => group.groupId === groupId);
  }

  /**
   * 取得技能的最大可用等級
   */
  getMaxSkillLevel(skillId) {
    if (!this.skillGroups) return 1;

    let maxLevel = 1;
    this.skillGroups.groups.forEach((group) => {
      group.entries.forEach((entry) => {
        if (entry.skillId === skillId) {
          maxLevel = Math.max(maxLevel, entry.level);
        }
      });
    });

    return maxLevel;
  }

  /**
   * 取得技能的所有可用等級
   */
  getAvailableSkillLevels(skillId) {
    if (!this.skillGroups) return [1];

    const levels = new Set();
    this.skillGroups.groups.forEach((group) => {
      group.entries.forEach((entry) => {
        if (entry.skillId === skillId) {
          levels.add(entry.level);
        }
      });
    });

    return levels.size === 0 ? [1] : Array.from(levels).sort((a, b) => a - b);
  }

  /**
   * 檢查技能是否在群組中可用
   */
  isSkillAvailableInGroups(skillId, level = 1) {
    if (!this.skillGroups) return false;

    return this.skillGroups.groups.some((group) =>
      group.entries.some(
        (entry) => entry.skillId === skillId && entry.level === level
      )
    );
  }

  /**
   * 取得技能所屬的群組類型
   */
  getSkillGroupTypes(skillId) {
    if (!this.skillGroups) return [];

    const groupTypes = new Set();
    this.skillGroups.groups.forEach((group) => {
      const hasSkill = group.entries.some((entry) => entry.skillId === skillId);
      if (hasSkill) {
        if (group.groupId.startsWith("weapon_skill_")) {
          groupTypes.add("武器技能");
        } else if (group.groupId.startsWith("armor_slot1_")) {
          groupTypes.add("防具一洞技能");
        } else if (group.groupId.startsWith("armor_slot2_")) {
          groupTypes.add("防具二洞技能");
        } else if (group.groupId.startsWith("armor_slot3_")) {
          groupTypes.add("防具三洞技能");
        }
      }
    });

    return Array.from(groupTypes);
  }

  /**
   * 分類技能（用於技能選擇器）
   */
  categorizeSkills() {
    if (!this.skills) return {};

    const categories = {
      all: this.skills,
      weapon_skills: [],
      armor_slot1: [],
      armor_slot2: [],
      armor_slot3: [],
      attack: [],
      defense: [],
      element: [],
      utility: [],
    };

    // 攻擊系技能列表
    const attackSkills = [
      "attack",
      "critical_eye",
      "weakness_exploit",
      "critical_boost",
      "agitator",
      "peak_performance",
      "critical_element",
      "critical_status",
      "critical_draw",
      "punishing_draw",
      "slugger",
      "stamina_thief",
    ];

    // 防禦系技能列表
    const defenseSkills = [
      "guard",
      "defense_boost",
      "divine_blessing",
      "recovery_up",
      "recovery_speed",
      "poison_resistance",
      "sleep_resistance",
      "paralysis_resistance",
      "stun_resistance",
      "earplugs",
      "tremor_resistance",
      "windproof",
      "fire_resistance",
      "water_resistance",
      "thunder_resistance",
      "ice_resistance",
      "dragon_resistance",
      "flinch_free",
    ];

    // 屬性系技能列表
    const elementSkills = [
      "fire_attack",
      "water_attack",
      "thunder_attack",
      "ice_attack",
      "dragon_attack",
      "poison_attack",
      "sleep_attack",
      "paralysis_attack",
      "blast_attack",
    ];

    this.skills.forEach((skill) => {
      const groupTypes = this.getSkillGroupTypes(skill.id);

      // 群組分類
      if (groupTypes.includes("武器技能")) {
        categories.weapon_skills.push(skill);
      }
      if (groupTypes.includes("防具一洞技能")) {
        categories.armor_slot1.push(skill);
      }
      if (groupTypes.includes("防具二洞技能")) {
        categories.armor_slot2.push(skill);
      }
      if (groupTypes.includes("防具三洞技能")) {
        categories.armor_slot3.push(skill);
      }

      // 傳統分類
      if (attackSkills.includes(skill.id)) {
        categories.attack.push(skill);
      } else if (defenseSkills.includes(skill.id)) {
        categories.defense.push(skill);
      } else if (elementSkills.includes(skill.id)) {
        categories.element.push(skill);
      } else {
        categories.utility.push(skill);
      }
    });

    return categories;
  }
}

// 創建全域實例
const charmDataManager = new CharmDataManager();

// 公開API
window.CharmData = {
  loadAllData: () => charmDataManager.loadAllData(),
  getSkills: () => charmDataManager.getSkills(),
  getSkillGroups: () => charmDataManager.getSkillGroups(),
  getRarities: () => charmDataManager.getRarities(),
  getSkillById: (skillId) => charmDataManager.getSkillById(skillId),
  getSkillGroupById: (groupId) => charmDataManager.getSkillGroupById(groupId),
  getMaxSkillLevel: (skillId) => charmDataManager.getMaxSkillLevel(skillId),
  getAvailableSkillLevels: (skillId) =>
    charmDataManager.getAvailableSkillLevels(skillId),
  isSkillAvailableInGroups: (skillId, level) =>
    charmDataManager.isSkillAvailableInGroups(skillId, level),
  getSkillGroupTypes: (skillId) => charmDataManager.getSkillGroupTypes(skillId),
  categorizeSkills: () => charmDataManager.categorizeSkills(),
};
