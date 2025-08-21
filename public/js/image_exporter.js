/**
 * 圖片匯出功能模組
 */
const CharmImageExporter = {
  async saveAsImage(calculationData) {
    const { timeEstimation, selectedSkills, charmSlots } = calculationData;

    try {
      // 1. 等待字體載入
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // 2. 建立畫布
      const canvas = document.createElement("canvas");
      canvas.width = 900;
      canvas.height = 1200;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Cannot get canvas context");

      const W = canvas.width;
      const H = canvas.height;

      // 3. 繪製背景與標題
      this.drawBackgroundAndTitles(ctx, W, H);

      // 4. 繪製主面板
      const panelX = 50,
        panelY = 160,
        panelW = W - 100,
        panelH = 450; // Adjusted panel size and position
      this.drawPanel(ctx, panelX, panelY, panelW, panelH, 20, "#1a1a1a");

      // 5. 載入圖片資源 (非同步)
      const stoneImg = await this.loadImage("./public/imgs/stone_template.png");

      // 6. 繪製面板內容 (統一繪製)
      // 6a. 護石圖片與期望次數
      const stoneW = 300;
      const stoneH = 300 * (stoneImg.height / stoneImg.width);
      const stoneX = panelX + 50;
      const stoneY = panelY + panelH / 2 - stoneH / 2; // 垂直居中
      ctx.drawImage(stoneImg, stoneX, stoneY, stoneW, stoneH);

      // 6b. 右側技能詳情
      const rightX = stoneX + stoneW + 60;
      let currentY = panelY + 60;

      ctx.fillStyle = "#d9f20b";
      ctx.textAlign = "left";
      ctx.font = 'bold 26px "Noto Sans TC", sans-serif';
      ctx.fillText("詳細資料", rightX, currentY);
      currentY += 40;

      ctx.fillStyle = "#fff";
      ctx.font = '20px "Noto Sans TC", sans-serif';
      ctx.fillText("發光護石", rightX, currentY);
      currentY += 30;

      // 繪製鑲嵌槽
      let slotX = rightX;
      charmSlots
        .filter((s) => s !== 0)
        .forEach((slot) => {
          ctx.fillText(slot === -1 ? "[W1]" : `[${slot}]`, slotX, currentY);
          slotX += 40;
        });
      currentY += 50;

      ctx.fillStyle = "#d9f20b";
      ctx.font = 'bold 26px "Noto Sans TC", sans-serif';
      ctx.fillText("裝備技能", rightX, currentY);
      currentY += 40;

      for (const skill of selectedSkills) {
        try {
          const icon = await this.loadImage(
            `./public/imgs/${skill.color || "placeholder_icon"}.png`
          );
          ctx.drawImage(icon, rightX, currentY - 28, 32, 32);
        } catch (e) {
          const placeholder = await this.loadImage(
            "./public/imgs/placeholder_icon.png"
          );
          ctx.drawImage(placeholder, rightX, currentY - 28, 32, 32);
        }
        ctx.fillStyle = "#fff";
        ctx.font = '20px "Noto Sans TC", sans-serif';
        ctx.fillText(
          `${skill.nameZh} Lv${skill.level || 1}`,
          rightX + 40,
          currentY
        );
        currentY += 40;
      }

      // Draw appraisals count below the panel
      const appraisalY = panelY + panelH + 80;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = 'bold 54px "Noto Sans TC", sans-serif';
      ctx.fillText(
        timeEstimation.expectedAppraisals.toLocaleString(),
        W / 2,
        appraisalY
      );

      ctx.font = '24px "Noto Sans TC", sans-serif';
      ctx.fillText("期望鑑定次數", W / 2, appraisalY + 40);

      // 彩蛋: 繪製綿羊
      try {
        const sheepImg = await this.loadImage("./public/imgs/sheep.png");
        const sheepSize = 180;
        const sheepX = (W - sheepSize) / 2;
        const sheepY = appraisalY + 90; // Place sheep below the appraisal count
        ctx.drawImage(sheepImg, sheepX, sheepY, sheepSize, sheepSize);
      } catch (error) {
        console.log("Failed to load sheep.png easter egg:", error);
      }

      // 8. 繪製底部資訊
      this.drawFooter(ctx, W, H, timeEstimation);

      // 9. 產生圖片並觸發下載
      this.downloadCanvas(canvas);
    } catch (error) {
      console.error("Error generating image:", error);
      throw error; // Re-throw to be caught by UI
    }
  },

  drawBackgroundAndTitles(ctx, W, H) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0f0f0f");
    bg.addColorStop(1, "#141414");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#9aa06a";
    ctx.textAlign = "left";
    ctx.font = '100 22px "Noto Sans TC", "Noto Sans", sans-serif';
    ctx.fillText("wilds.bmon.tw", 20, 44);

    ctx.fillStyle = "#d9f20b";
    ctx.textAlign = "center";
    ctx.font = 'bold 36px "Noto Sans TC", sans-serif';
    ctx.fillText("魔物獵人 Wilds 護石計算結果", W / 2, 100);
  },

  drawPanel(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  },

  drawFooter(ctx, W, H, timeEstimation) {
    const timeText =
      window.CharmCalculator.formatTimeEstimation(timeEstimation);
    const fullText = `根據計算，你平均要等待 ${timeText} 才能鑑定到這樣一顆護石`;
    ctx.fillStyle = "#ccc";
    ctx.textAlign = "center";
    ctx.font = '24px "Noto Sans TC", sans-serif';
    this.wrapText(ctx, fullText, W / 2, H - 180, W - 100, 30); // Adjusted Y position

    ctx.fillStyle = "#d9f20b";
    ctx.font = 'bold 32px MantouSans, "Noto Sans TC", sans-serif';
    ctx.fillText("wilds.bmon.tw", W / 2, H - 80);
  },

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  },

  downloadCanvas(canvas) {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `魔物獵人Wilds護石計算結果_${new Date()
          .toISOString()
          .slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }, "image/png");
  },

  wrapText(context, text, x, y, maxWidth, lineHeight) {
    let words = text.split("");
    let line = "";
    let startY = y;
    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n];
      let metrics = context.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, startY);
        line = words[n];
        startY += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, startY);
  },
};

window.CharmImageExporter = CharmImageExporter;
