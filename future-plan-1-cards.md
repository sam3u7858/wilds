# 多護石組合計算功能

## 需求背景

使用者希望能夠同時設定多個護石條件,例如:

- 卡片 1: 看破3 + [W1]
- 卡片 2: 攻擊3 + [2][1]  
- 卡片 3: 集中3 + [1][1]

系統需要:

1. 分別計算每個組合的機率
2. 提供「合併計算」功能,計算獲得其中任意一種的總體機率
3. 顯示期望鑑定次數

## UI 設計方案

### 1. 多卡片頁籤結構

在 `conditions-section` 上方新增頁籤控制:

```html
<div class="charm-tabs-container">
  <!-- 頁籤列表 -->
  <div class="charm-tabs">
    <button class="tab-item active" data-tab="1">
      <span class="tab-name">護石 #1</span>
      <button class="tab-close">×</button>
    </button>
    <button class="tab-item" data-tab="2">
      <span class="tab-name">護石 #2</span>
      <button class="tab-close">×</button>
    </button>
    <button class="tab-add">+ 新增條件</button>
  </div>
  
  <!-- 合併計算按鈕 -->
  <div class="merge-calculation-section">
    <button class="merge-toggle-btn">
      <svg>展開圖示</svg>
      <span>合併計算 (2個條件)</span>
    </button>
  </div>
  
  <!-- 合併結果區域 (可展開/收合) -->
  <div class="merged-results" style="display: none;">
    <div class="merged-probability-card">
      <h3>總體機率</h3>
      <div class="merged-stats">
        <div class="stat-item">
          <span class="label">獲得任意一種的機率:</span>
          <span class="value">0.0234%</span>
        </div>
        <div class="stat-item">
          <span class="label">期望鑑定次數:</span>
          <span class="value">4,273 次</span>
        </div>
        <div class="stat-item">
          <span class="label">預估時間:</span>
          <span class="value">142 小時</span>
        </div>
      </div>
      
      <!-- 分項機率明細 -->
      <div class="probability-breakdown">
        <h4>各組合機率:</h4>
        <div class="breakdown-item">
          <span>護石 #1 (看破3 + [W1]):</span>
          <span>0.0089%</span>
        </div>
        <div class="breakdown-item">
          <span>護石 #2 (攻擊3 + [2][1]):</span>
          <span>0.0145%</span>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 卡片內容區域 -->
  <div class="tab-content active" data-content="1">
    <!-- 原本的 conditions-section 內容 -->
  </div>
  
  <div class="tab-content" data-content="2">
    <!-- 第二個護石的條件設定 -->
  </div>
</div>
```

### 2. 資料結構調整

**ui.js:**

```javascript
class CharmUI {
  constructor() {
    this.charmConfigs = [
      {
        id: 1,
        name: '護石 #1',
        selectedSkills: [],
        charmSlots: [],
        calculationResults: [],
        timeEstimation: null
      }
    ];
    this.activeConfigId = 1;
    this.mergeCalculationExpanded = false;
  }
}
```

### 3. 核心功能

#### 3.1 頁籤管理

- **新增頁籤**: 創建新的護石條件配置
- **切換頁籤**: 載入對應的條件和結果
- **刪除頁籤**: 移除不需要的配置
- **重命名**: 允許使用者自訂名稱

#### 3.2 合併計算邏輯

**calculator.js 新增方法:**

```javascript
/**
 * 計算多個護石條件的合併機率
 * 使用機率論的聯集公式: P(A∪B) = P(A) + P(B) - P(A∩B)
 * 因為護石組合互斥,所以 P(A∩B) = 0
 */
calculateMergedProbability(criteriaList) {
  let mergedResults = [];
  let totalProbability = 0;
  
  criteriaList.forEach(criteria => {
    const results = this.calculateCharmProbability(criteria);
    if (results.length > 0) {
      const topResult = results[0];
      totalProbability += topResult.totalProbability;
      mergedResults.push({
        criteria,
        probability: topResult.totalProbability,
        results
      });
    }
  });
  
  return {
    totalProbability,
    expectedAppraisals: Math.round(1 / totalProbability),
    breakdown: mergedResults
  };
}
```

### 4. CSS 樣式

**main.css:**

```css
/* Charm Tabs */
.charm-tabs-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.charm-tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #333;
  padding-bottom: 0.5rem;
}

.tab-item {
  position: relative;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  background: #1f1f1f;
  border: 1px solid #333;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  color: #888;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-item.active {
  background: #2a2a2a;
  border-color: #d9f20b;
  color: #d9f20b;
  border-bottom: 2px solid #2a2a2a;
  margin-bottom: -2px;
}

.tab-close {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 18px;
  padding: 0 0.25rem;
}

.tab-close:hover {
  color: #ff4444;
}

.tab-add {
  padding: 0.75rem 1rem;
  background: transparent;
  border: 1px dashed #444;
  border-radius: 8px;
  color: #888;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-add:hover {
  border-color: #d9f20b;
  color: #d9f20b;
}

/* Merge Calculation */
.merge-calculation-section {
  padding: 1rem;
  background: rgba(217, 242, 11, 0.05);
  border-radius: 8px;
  border: 1px solid #333;
}

.merge-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  color: #d9f20b;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}

.merged-results {
  padding: 1.5rem;
  background: #1a1a1a;
  border-radius: 8px;
  border: 2px solid #d9f20b;
}

.merged-probability-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.merged-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  background: #2a2a2a;
  border-radius: 8px;
}

.stat-item .label {
  color: #888;
  font-size: 14px;
}

.stat-item .value {
  color: #d9f20b;
  font-size: 24px;
  font-weight: bold;
}

.probability-breakdown {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #333;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  border-bottom: 1px solid #2a2a2a;
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}
```

### 5. 實作步驟

1. **資料結構重構**: 將單一配置改為多配置陣列
2. **頁籤 UI**: 實作頁籤切換、新增、刪除功能
3. **獨立計算**: 每個頁籤獨立計算機率
4. **合併計算**: 實作合併機率計算邏輯
5. **結果展示**: 可展開/收合的合併結果區域
6. **i18n 支援**: 中英文雙語支援

### 6. 技術挑戰

- **狀態管理**: 需要妥善管理多個配置的狀態
- **計算效能**: 多個條件可能增加計算負擔
- **UI 複雜度**: 需要確保介面不會太複雜混亂
- **資料同步**: 切換頁籤時要正確載入和保存狀態

## 預期效果

✅ 使用者可以同時追蹤多個護石目標

✅ 清楚看到每個組合的獨立機率

✅ 了解獲得「任意一種」的總體機率

✅ 更準確的期望值計算

✅ 更符合實際使用場景