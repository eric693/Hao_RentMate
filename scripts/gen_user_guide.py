# -*- coding: utf-8 -*-
"""重建 RentMate 使用說明手冊 PDF，並加入「獨立電錶（抄表計費）」說明。"""
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table,
    TableStyle, PageBreak, KeepTogether,
)

FONT_PATH = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
pdfmetrics.registerFont(TTFont("WQY", FONT_PATH, subfontIndex=0))
FONT = "WQY"

GREEN_DARK = colors.HexColor("#4A6741")   # 區段標題底色 / 表頭
GREEN_MED = colors.HexColor("#5E7556")    # 標題 / 小節標題
GRAY = colors.HexColor("#8A8A8A")
INK = colors.HexColor("#333333")
WARM = colors.HexColor("#F5F0EB")
NOTE_BG = colors.HexColor("#F3EFE7")
LINE_GRAY = colors.HexColor("#E5E0D8")

styles = {
    "title": ParagraphStyle("title", fontName=FONT, fontSize=27, textColor=GREEN_MED, leading=34),
    "subtitle": ParagraphStyle("subtitle", fontName=FONT, fontSize=15, textColor=GREEN_MED, leading=22),
    "tagline": ParagraphStyle("tagline", fontName=FONT, fontSize=10.5, textColor=GRAY, leading=16),
    "section": ParagraphStyle("section", fontName=FONT, fontSize=15, textColor=colors.white, leading=20),
    "sub": ParagraphStyle("sub", fontName=FONT, fontSize=12.5, textColor=GREEN_MED, leading=20, spaceBefore=10, spaceAfter=4),
    "body": ParagraphStyle("body", fontName=FONT, fontSize=10.5, textColor=INK, leading=17, wordWrap="CJK"),
    "bullet": ParagraphStyle("bullet", fontName=FONT, fontSize=10.5, textColor=INK, leading=17, leftIndent=14, firstLineIndent=-9, wordWrap="CJK"),
    "step": ParagraphStyle("step", fontName=FONT, fontSize=10.5, textColor=INK, leading=17, leftIndent=16, firstLineIndent=-16, wordWrap="CJK"),
    "note": ParagraphStyle("note", fontName=FONT, fontSize=9.5, textColor=colors.HexColor("#5A5249"), leading=15, wordWrap="CJK"),
    "cell": ParagraphStyle("cell", fontName=FONT, fontSize=10, textColor=INK, leading=14),
    "cellh": ParagraphStyle("cellh", fontName=FONT, fontSize=10, textColor=colors.white, leading=14),
}

story = []


def section(num_title):
    t = Table([[Paragraph(num_title, styles["section"])]], colWidths=[170 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREEN_DARK),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(Spacer(1, 12))
    story.append(t)
    story.append(Spacer(1, 8))


def sub(text):
    story.append(Paragraph(text, styles["sub"]))


def body(text):
    story.append(Paragraph(text, styles["body"]))


def bullets(items):
    for it in items:
        story.append(Paragraph("•  " + it, styles["bullet"]))


def steps(items):
    for i, it in enumerate(items, 1):
        story.append(Paragraph(f"{i}.  " + it, styles["step"]))


def note(text):
    t = Table([[Paragraph(text, styles["note"])]], colWidths=[170 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NOTE_BG),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(Spacer(1, 6))
    story.append(t)
    story.append(Spacer(1, 4))


def info_table(rows, widths):
    data = [[Paragraph(c, styles["cellh"]) for c in rows[0]]]
    for r in rows[1:]:
        data.append([Paragraph(c, styles["cell"]) for c in r])
    t = Table(data, colWidths=widths)
    st = [
        ("BACKGROUND", (0, 0), (-1, 0), GREEN_DARK),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE_GRAY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            st.append(("BACKGROUND", (0, i), (-1, i), WARM))
    t.setStyle(TableStyle(st))
    story.append(t)


# ---------- 封面 ----------
story.append(Spacer(1, 70 * mm))
story.append(Paragraph("RentMate 倉儲租賃管理系統", styles["title"]))
story.append(Spacer(1, 4))
story.append(Paragraph("使用說明手冊", styles["subtitle"]))
story.append(Spacer(1, 16))
story.append(Paragraph("給管理者、員工與租客的完整操作指南", styles["tagline"]))
story.append(Spacer(1, 18))
info_table([
    ["項目", "網址 / 資訊"],
    ["管理後台", "https://hao-rentmate.crownai.ink"],
    ["租客專區", "https://hao-rentmate.crownai.ink/tenant/login"],
    ["LINE 官方帳號", "租客系統（ID：@488dmbod）"],
    ["版本", "v1.2 ／ 2026 年 6 月"],
], [45 * mm, 125 * mm])
story.append(PageBreak())

# ---------- 一、系統簡介 ----------
section("一、系統簡介")
body("本系統是一套倉儲租賃管理平台，協助管理倉庫據點、租客、合約、帳務與報修，並整合 LINE 官方帳號自動發送通知。")
sub("兩個入口")
bullets([
    "管理後台：管理者與員工使用，管理倉儲、租客、合約、帳務與報修。",
    "租客專區：租客用手機以綁定碼登入，查看租約、繳費、線上簽約與報修。",
])
sub("三種角色")
bullets([
    "管理員（業主）：擁有全部功能，可建立員工帳號並分配權限。",
    "員工：只能使用被授權的功能模組，與管理員共用同一份資料。",
    "租客：使用租客專區，只看得到自己的資料。",
])

# ---------- 二、倉儲管理 ----------
section("二、倉儲管理")
body("「倉儲管理」是系統的核心模組，管理「據點」與其下的「倉庫」。")
sub("2-1 建立據點與倉庫")
steps([
    "在「倉儲管理」點「新增據點」，填寫據點名稱與地址。",
    "在據點下點「+ 倉庫」新增倉庫，填寫倉庫編號與下列資訊。",
])
sub("2-2 倉庫可記錄的資訊")
bullets([
    "倉庫編號、樓層、月租金",
    "面積（坪）",
    "溫控類型：常溫 / 冷藏 / 冷凍 / 恆溫恆濕",
    "棧板位數",
    "用途／類型：一般倉、危險品、保稅倉…",
    "獨立電錶：可勾選「此倉庫收電費」，並設定電費單價（元/度）與目前電錶度數；未勾選的倉庫不會被收電費。",
])
body("倉庫卡片會直接顯示溫控、面積、棧板位、獨立電錶與出租狀態，一眼掌握。")
note("刪除據點前需先刪除其下倉庫；刪除倉庫前需先處理其合約，系統會提示。")

# ---------- 三、合約與電子簽署 ----------
section("三、合約與電子簽署")
steps([
    "在「合約」建立合約：選擇倉庫與租客，填寫租期、月租、押金，必要時填「自訂條款」。",
    "合約未簽署前可隨時「編輯」修改內容。",
    "點「邀請簽署」產生簽署連結（透過 LINE 發送或複製連結給租客）。",
    "租客完成簽署後，合約自動鎖定不可修改，僅能變更狀態（如終止）。",
    "租客簽署時須上傳證件，管理員可點「查看證件」核對（證件採私密儲存，需登入授權才能檢視）。",
])

# ---------- 四、帳務與其他功能 ----------
section("四、帳務與其他功能")
bullets([
    "帳務：收款工作台、租金管理、對帳中心、水電費（獨立電錶／費用分攤）、支出記錄、租賃報稅。",
    "報修：處理租客提交的維修（AI 自動分類：鐵捲門/門禁、消防/安全、漏水/排水、溫控設備、裝卸/設備…）。",
    "投報分析：各據點收益、空置成本與年化投報率。",
    "租金行情：在地倉庫租金行情與定價健檢。",
    "空房刊登：空置倉庫招租。",
])

sub("4-1 水電費與獨立電錶（抄表計費）")
body("在「帳務 → 水電帳單」操作。系統支援兩種計費方式，可依各據點實際情況擇一：")
bullets([
    "獨立電錶（抄表）：每個倉庫各有電錶，逐戶依「(本期度數 − 上期度數) × 單價」計費；沒有電錶或本期不收電費的倉庫不會列入，也不會被收費。",
    "費用分攤：一張總帳單，依平均／坪數／人頭／用量拆分給在住倉庫（適用共用電錶）。",
])
body("獨立電錶操作步驟：")
steps([
    "先到「倉儲管理」編輯倉庫，勾選「獨立電錶」並填寫電費單價與目前度數。",
    "在「水電帳單」點「費用分攤」，計費方式選「獨立電錶（抄表）」。",
    "系統只列出有電錶的在住倉庫，逐戶填本期度數（上期、單價自動帶入，可修改）。",
    "點「試算電費」確認各戶金額與合計，再「建立電費帳單」。",
    "點「LINE 開帳給租客」，系統把度數明細與應繳金額推播給該倉庫租客，並自動把本期度數記為下期的「上期」值。",
])
note("沒有獨立電錶的倉庫不必設定，水電帳單也不會向其收費；想改用共用電錶分攤時，將計費方式改選平均／坪數／人頭／用量即可。")

sub("資料匯出（Excel / PDF）")
body("幾乎每個資料頁右上角都有 Excel 與 PDF 匯出鈕，可一鍵下載：倉庫清單、租客、合約、租金、水電、支出、報修、對帳、投報、總覽、財務總覽。")

sub("使用者管理（建立員工 / 分配權限）")
steps([
    "進入「使用者管理」（僅管理員可見），點「新增使用者」。",
    "填寫 Email、姓名、密碼，勾選此員工可使用的模組。",
    "員工登入後只看得到被授權的功能，未授權的自動隱藏。",
])

# ---------- 五、租客專區 ----------
section("五、租客專區")
body("租客登入只需要一組「邀請碼」（房東提供，8 碼、24 小時內有效）。同一組碼有兩個用途：綁定 LINE 收通知，以及登入租客專區網頁。")
sub("房東：如何產生邀請碼")
steps([
    "後台進入「帳號設定」，找到「租客 LINE 綁定」區。",
    "點該租客的「產生邀請碼」，把 8 碼邀請碼提供給租客（過期可重新產生）。",
])
sub("5-1 租客登入（兩種方式，擇一即可）")
body("方式 A — 加 LINE 收通知（推薦）")
steps([
    "用 LINE 搜尋 ID @488dmbod 或掃 QR Code，加入「租客系統」官方帳號好友。",
    "在聊天室直接輸入房東給的邀請碼。",
    "看到「✅ 租客綁定成功」即完成，之後簽約、繳費、報修通知都會推播到 LINE。",
])
body("方式 B — 開租客專區網頁")
steps([
    "用手機瀏覽器開啟 https://hao-rentmate.crownai.ink/tenant/login。",
    "輸入房東提供的綁定碼即可登入（免另設密碼）。",
])
note("兩種方式用的是同一組碼。建議租客先用方式 A 綁定 LINE，才能即時收到房東推播的通知。")
sub("5-2 四個分頁")
bullets([
    "首頁：個人資料、付款資訊（承租倉庫、月租、繳費帳號、未結清金額）。",
    "租約：查看租約與簽署狀態，可線上簽約。",
    "繳費：各期租金金額與繳款狀態。",
    "報修：填寫問題、上傳照片（最多 6 張）送出，系統通知管理員。",
])
sub("5-3 線上簽約")
steps([
    "在「租約」分頁點「前往線上簽約」。",
    "閱讀合約內容與條款。",
    "填寫簽署人姓名、上傳證件照片（必填）、勾選同意。",
    "點「確認簽署」完成，具書面簽名同等效力。",
])

# ---------- 六、LINE 官方帳號 ----------
section("六、LINE 官方帳號使用說明")
body("本系統已串接 LINE 官方帳號「租客系統」（ID：@488dmbod），可自動把通知推播到租客的 LINE。")
sub("6-1 管理員：啟用設定（一次性）")
steps([
    "登入 LINE Developers Console（developers.line.biz）。",
    "進入本系統的 Messaging API channel（Channel ID：2010428944）。",
    "Webhook URL 設為：https://hao-rentmate.crownai.ink/api/line/webhook",
    "開啟「Use webhook」。",
    "於 LINE Official Account Manager 關閉「自動回覆訊息」，避免衝突。",
])
sub("6-2 租客：加好友並綁定（同第五章方式 A）")
steps([
    "用 LINE 搜尋 ID @488dmbod 或掃 QR Code，加入「租客系統」好友。",
    "向房東索取邀請碼（房東於「帳號設定」產生）。",
    "在 LINE 聊天室直接輸入邀請碼，系統自動配對。",
    "出現「✅ 租客綁定成功」後，即可在 LINE 收到簽約邀請、繳費提醒、報修進度等通知。",
])
note("租客必須先加好友並完成綁定，系統才能推播；未綁定者，房東可改用複製連結方式手動傳送簽署等連結。邀請碼有時效，過期請由房東重新產生。")

# ---------- 七、測試帳號速查 ----------
section("七、測試帳號速查")
sub("管理後台")
info_table([
    ["角色", "帳號（Email）", "密碼"],
    ["管理員", "landlord@example.com", "password123"],
    ["員工（範例：僅帳務）", "accountant@hao.com", "acc12345"],
], [55 * mm, 75 * mm, 40 * mm])
sub("租客專區（綁定碼登入）")
info_table([
    ["租客", "綁定碼（範例）"],
    ["焦滿", "D5021372"],
    ["阿兩", "C53EC0F8"],
    ["小芝", "604B3EBC"],
    ["張哥", "FF42F623"],
], [85 * mm, 85 * mm])
note("綁定碼有時效，過期請由管理員於後台重新產生；線上報修需有有效合約。")


# ---------- footer ----------
def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT, 8.5)
    canvas.setFillColor(GRAY)
    canvas.drawString(20 * mm, 12 * mm, "RentMate 倉儲租賃管理系統　使用說明手冊")
    canvas.drawRightString(190 * mm, 12 * mm, f"第 {doc.page} 頁")
    canvas.restoreState()


doc = BaseDocTemplate(
    sys.argv[1], pagesize=A4,
    leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=20 * mm,
    title="RentMate 倉儲管理使用說明手冊", author="RentMate",
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=footer)])
doc.build(story)
print("OK", sys.argv[1])
