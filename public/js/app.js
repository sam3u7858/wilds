/**
 * 主應用文件 - 負責初始化和協調各個模組
 */

class CharmApp {
  constructor() {
    this.dataLoaded = false;
    this.ui = null;
    this.loadingOverlay = null;
    this.appContainer = null;
  }

  /**
   * 初始化應用
   */
  async init() {
    try {
      // 獲取DOM元素
      this.loadingOverlay = document.getElementById("loadingOverlay");
      this.appContainer = document.getElementById("app");

      // 顯示載入中
      this.showLoading("載入護石計算器...");

      // 載入數據
      await this.loadData();

      // 初始化UI
      this.initUI();

      // 隱藏載入畫面，顯示應用
      this.hideLoading();

      console.log("護石計算器初始化完成");
    } catch (error) {
      console.error("應用初始化失敗:", error);
      this.showError("載入失敗，請重新整理頁面再試");
    }
  }

  /**
   * 載入數據
   */
  async loadData() {
    try {
      this.showLoading("載入數據中...");

      // 載入所有遊戲數據
      await window.CharmData.loadAllData();

      this.dataLoaded = true;
      console.log("數據載入完成");
    } catch (error) {
      console.error("數據載入失敗:", error);
      throw new Error("無法載入遊戲數據，請檢查網路連線");
    }
  }

  /**
   * 初始化UI
   */
  initUI() {
    try {
      this.showLoading("初始化界面...");

      // 初始化UI管理器
      this.ui = window.charmUI;
      this.ui.init();

      console.log("UI初始化完成");
    } catch (error) {
      console.error("UI初始化失敗:", error);
      throw new Error("界面初始化失敗");
    }
  }

  /**
   * 顯示載入畫面
   */
  showLoading(message = "載入中...") {
    if (this.loadingOverlay) {
      const loadingText = this.loadingOverlay.querySelector(".loading-text");
      if (loadingText) {
        loadingText.textContent = message;
      }
      this.loadingOverlay.style.display = "flex";
    }

    if (this.appContainer) {
      this.appContainer.style.display = "none";
    }
  }

  /**
   * 隱藏載入畫面
   */
  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = "none";
    }

    if (this.appContainer) {
      this.appContainer.style.display = "block";
    }
  }

  /**
   * 顯示錯誤
   */
  showError(message) {
    if (this.loadingOverlay) {
      this.loadingOverlay.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; color: #ff6b6b;">
                    <div style="font-size: 48px;">⚠️</div>
                    <div style="font-size: 18px; text-align: center; max-width: 400px;">${message}</div>
                    <button onclick="location.reload()" style="
                        padding: 12px 24px;
                        background: #d9f20b;
                        color: #000;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: 600;
                    ">重新載入</button>
                </div>
            `;
      this.loadingOverlay.style.display = "flex";
    }
  }

  /**
   * 檢查瀏覽器兼容性
   */
  checkBrowserCompatibility() {
    const requiredFeatures = [
      "fetch" in window,
      "Promise" in window,
      "Map" in window,
      "Set" in window,
    ];

    const isCompatible = requiredFeatures.every((feature) => feature);

    if (!isCompatible) {
      this.showError("您的瀏覽器版本過舊，請更新瀏覽器以使用本計算器");
      return false;
    }

    return true;
  }

  /**
   * 設置全域錯誤處理
   */
  setupErrorHandling() {
    // 處理未捕獲的錯誤
    window.addEventListener("error", (event) => {
      console.error("全域錯誤:", event.error);

      // 如果應用還沒完全載入，顯示錯誤頁面
      if (!this.dataLoaded) {
        this.showError("載入過程中發生錯誤，請重新整理頁面");
      }
    });

    // 處理未捕獲的Promise拒絕
    window.addEventListener("unhandledrejection", (event) => {
      console.error("未處理的Promise拒絕:", event.reason);

      if (!this.dataLoaded) {
        this.showError("載入過程中發生錯誤，請重新整理頁面");
      }
    });
  }

  /**
   * 設置性能監控
   */
  setupPerformanceMonitoring() {
    // 記錄頁面載入時間
    window.addEventListener("load", () => {
      const loadTime = performance.now();
      console.log(`頁面載入時間: ${loadTime.toFixed(2)}ms`);
    });

    // 記錄應用初始化時間
    const initStartTime = performance.now();

    // 在初始化完成後記錄
    const originalHideLoading = this.hideLoading.bind(this);
    this.hideLoading = () => {
      originalHideLoading();
      const initTime = performance.now() - initStartTime;
      console.log(`應用初始化時間: ${initTime.toFixed(2)}ms`);
    };
  }

  /**
   * 設置鍵盤快捷鍵
   */
  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
      // Escape 鍵關閉模態窗口
      if (event.key === "Escape") {
        // 關閉技能選擇器
        const skillModal = document.getElementById("skillSelectorModal");
        if (skillModal && skillModal.style.display === "flex") {
          window.hideSkillSelector();
          event.preventDefault();
        }

        // 關閉分享模態窗口
        const shareModal = document.getElementById("shareModal");
        if (shareModal && shareModal.style.display === "flex") {
          window.hideShareModal();
          event.preventDefault();
        }
      }

      // Ctrl/Cmd + K 開啟技能搜尋
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        window.showSkillSelector();
        event.preventDefault();

        // 聚焦到搜尋框
        setTimeout(() => {
          const searchInput = document.getElementById("skillSearch");
          if (searchInput) {
            searchInput.focus();
          }
        }, 100);
      }
    });
  }

  /**
   * 設置觸摸設備支持
   */
  setupTouchSupport() {
    // 檢測觸摸設備
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
      document.body.classList.add("touch-device");

      // 調整某些交互行為
      const style = document.createElement("style");
      style.textContent = `
                .touch-device .nav-button:hover {
                    background: rgba(60, 60, 60, 0.8);
                }
                .touch-device .skill-card:hover {
                    transform: none;
                }
            `;
      document.head.appendChild(style);
    }
  }

  /**
   * 設置離線支持（基礎版本）
   */
  setupOfflineSupport() {
    // 檢測網路狀態
    const updateOnlineStatus = () => {
      const status = navigator.onLine ? "online" : "offline";
      document.body.setAttribute("data-connection", status);

      if (!navigator.onLine) {
        console.warn("網路連線中斷，某些功能可能無法正常使用");
      }
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // 初始檢查
    updateOnlineStatus();
  }
}

/**
 * 應用入口點
 */
document.addEventListener("DOMContentLoaded", async () => {
  // 創建應用實例
  const app = new CharmApp();

  // 設置錯誤處理
  app.setupErrorHandling();

  // 設置性能監控
  app.setupPerformanceMonitoring();

  // 檢查瀏覽器兼容性
  if (!app.checkBrowserCompatibility()) {
    return;
  }

  // 設置鍵盤快捷鍵
  app.setupKeyboardShortcuts();

  // 設置觸摸設備支持
  app.setupTouchSupport();

  // 設置離線支持
  app.setupOfflineSupport();

  // 初始化應用
  await app.init();

  // 將應用實例掛載到全域
  window.charmApp = app;
});

/**
 * 頁面可見性變化處理
 */
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("頁面隱藏");
  } else {
    console.log("頁面顯示");
    // 可以在這裡檢查數據是否需要更新
  }
});

/**
 * 防止意外離開頁面（如果有未保存的更改）
 */
window.addEventListener("beforeunload", (event) => {
  // 如果用戶有選擇的技能或設置，可以提示確認
  const hasSelections =
    window.charmUI &&
    (window.charmUI.selectedSkills.length > 0 ||
      window.charmUI.charmSlots.some((slot) => slot !== 0));

  if (hasSelections) {
    // 現代瀏覽器會顯示通用訊息
    event.preventDefault();
    event.returnValue = "";
  }
});

/**
 * Service Worker 註冊（為未來的離線功能準備）
 */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service Worker 註冊成功:", registration);
      })
      .catch((error) => {
        console.log("Service Worker 註冊失敗:", error);
      });
  });
}
