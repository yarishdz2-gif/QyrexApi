-- QyrexApi Anti-Dump v3 Loader
-- IMPORTANT: use HTTPS in production.
-- This loader targets Luau environments that expose `request` and a `crypt` API.

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer

local API = "https://YOUR-DOMAIN.example.com"
local SCRIPT_ID = "demo"
local KEY = "PUT-USER-KEY-HERE"

local HttpRequest = request or http_request or (syn and syn.request)
local Crypt = crypt

local function decoy()
    print("skidder noob")
    return false
end

if type(HttpRequest) ~= "function" then
    return decoy()
end

if type(Crypt) ~= "table" then
    return decoy()
end

-- ==================== QYREX TERMINAL UI LOADER ====================
-- Runs the fancy terminal animation while the protected loader executes.
task.spawn(function()
local TweenService = game:GetService("TweenService")

local player = LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local CONFIG = {
	Link = "https://qyrex.hopto.org",
	Discord = "YzCsksufde",

	TotalDuration = 8,
	TypingDuration = 3,
	ProgressDuration = 3,
	ClosingDuration = 2,

	TerminalWidth = 710,
	TerminalHeight = 460,

	WatermarkX = 12,
	WatermarkY = 55,

	ColorCycle = 0.5,

	Animations = true,
	ColorChanging = true,
	ShowWatermark = true
}

local COLORS = {
	Green = Color3.fromRGB(0, 255, 95),
	Cyan = Color3.fromRGB(75, 220, 255),
	Purple = Color3.fromRGB(170, 90, 255),
	Pink = Color3.fromRGB(255, 85, 190),
	Orange = Color3.fromRGB(255, 175, 65),

	White = Color3.fromRGB(245, 245, 250),
	Gray = Color3.fromRGB(135, 140, 150),
	Muted = Color3.fromRGB(95, 100, 110),

	Dark = Color3.fromRGB(7, 7, 10),
	Panel = Color3.fromRGB(15, 15, 20),
	Panel2 = Color3.fromRGB(21, 21, 28),
	Panel3 = Color3.fromRGB(28, 28, 36)
}

local oldGui = playerGui:FindFirstChild("QyrexTerminalUI")

if oldGui then
	oldGui:Destroy()
end

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "QyrexTerminalUI"
screenGui.IgnoreGuiInset = true
screenGui.ResetOnSpawn = false
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 999
screenGui.Parent = playerGui

local function tween(instance, duration, properties, style, direction)
	local info = TweenInfo.new(
		duration,
		style or Enum.EasingStyle.Quad,
		direction or Enum.EasingDirection.Out
	)

	local animation = TweenService:Create(
		instance,
		info,
		properties
	)

	animation:Play()

	return animation
end

local function makeCorner(instance, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = instance
	return corner
end

local function makeStroke(instance, color, thickness, transparency)
	local stroke = Instance.new("UIStroke")
	stroke.Color = color
	stroke.Thickness = thickness
	stroke.Transparency = transparency
	stroke.Parent = instance
	return stroke
end

local function makeText(parent, text, size, color)
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextSize = size
	label.TextColor3 = color
	label.Font = Enum.Font.Code
	label.Parent = parent
	return label
end

local function copyText(text)
	local success = false

	pcall(function()
		if setclipboard then
			setclipboard(text)
			success = true
		elseif toclipboard then
			toclipboard(text)
			success = true
		end
	end)

	return success
end

local terminal = Instance.new("Frame")
terminal.Name = "Terminal"
terminal.Size = UDim2.fromOffset(CONFIG.TerminalWidth, CONFIG.TerminalHeight)
terminal.Position = UDim2.new(
	0.5,
	-CONFIG.TerminalWidth / 2,
	0.5,
	-CONFIG.TerminalHeight / 2
)
terminal.BackgroundColor3 = COLORS.Dark
terminal.BackgroundTransparency = 1
terminal.BorderSizePixel = 0
terminal.Parent = screenGui

makeCorner(terminal, 13)

local terminalStroke = makeStroke(
	terminal,
	COLORS.Green,
	1.5,
	1
)

local terminalScale = Instance.new("UIScale")
terminalScale.Scale = 1
terminalScale.Parent = terminal

local function updateTerminalScale()
	local camera = workspace.CurrentCamera

	if not camera then
		return
	end

	local viewport = camera.ViewportSize

	local sx = viewport.X / 960
	local sy = viewport.Y / 730

	terminalScale.Scale = math.clamp(
		math.min(sx, sy),
		0.55,
		1
	)
end

updateTerminalScale()

if workspace.CurrentCamera then
	workspace.CurrentCamera:GetPropertyChangedSignal(
		"ViewportSize"
	):Connect(updateTerminalScale)
end

local header = Instance.new("Frame")
header.Name = "Header"
header.Size = UDim2.new(1, 0, 0, 35)
header.BackgroundColor3 = COLORS.Panel
header.BackgroundTransparency = 1
header.BorderSizePixel = 0
header.Parent = terminal

makeCorner(header, 13)

local dots = {
	{
		x = 13,
		color = Color3.fromRGB(255, 80, 80)
	},
	{
		x = 29,
		color = Color3.fromRGB(255, 190, 70)
	},
	{
		x = 45,
		color = Color3.fromRGB(70, 230, 120)
	}
}

for _, data in ipairs(dots) do
	local dot = Instance.new("Frame")

	dot.Size = UDim2.fromOffset(8, 8)
	dot.Position = UDim2.new(
		0,
		data.x,
		0.5,
		-4
	)

	dot.BackgroundColor3 = data.color
	dot.BackgroundTransparency = 1
	dot.BorderSizePixel = 0
	dot.Parent = header

	makeCorner(dot, 20)
end

local headerTitle = makeText(
	header,
	"QYREX  //  PREMIUM SCRIPT LOADER",
	12,
	COLORS.White
)

headerTitle.Size = UDim2.new(
	1,
	-90,
	1,
	0
)

headerTitle.Position = UDim2.new(
	0,
	70,
	0,
	0
)

headerTitle.TextXAlignment = Enum.TextXAlignment.Left
headerTitle.TextYAlignment = Enum.TextYAlignment.Center
headerTitle.TextTransparency = 1

local statusLabel = makeText(
	terminal,
	"[ SYSTEM ] Initializing Qyrex...",
	12,
	COLORS.Green
)

statusLabel.Size = UDim2.new(
	1,
	-30,
	0,
	20
)

statusLabel.Position = UDim2.new(
	0,
	15,
	0,
	46
)

statusLabel.TextXAlignment = Enum.TextXAlignment.Left
statusLabel.TextTransparency = 1

local asciiArt = [[
       ██████╗ ██╗   ██╗██████╗ ███████╗██╗  ██╗
      ██╔═══██╗╚██╗ ██╔╝██╔══██╗██╔════╝╚██╗██╔╝
      ██║   ██║ ╚████╔╝ ██████╔╝█████╗   ╚███╔╝
      ██║▄▄ ██║  ╚██╔╝  ██╔══██╗██╔══╝   ██╔██╗
      ╚██████╔╝   ██║   ██║  ██║███████╗██╔╝ ██╗
       ╚══▀▀═╝    ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝

                    SCRIPT LOADER
]]

local asciiLabel = makeText(
	terminal,
	"",
	11,
	COLORS.Green
)

asciiLabel.Size = UDim2.new(
	1,
	-30,
	0,
	180
)

asciiLabel.Position = UDim2.new(
	0,
	15,
	0,
	77
)

asciiLabel.TextXAlignment = Enum.TextXAlignment.Left
asciiLabel.TextYAlignment = Enum.TextYAlignment.Top
asciiLabel.TextTransparency = 1

local logs = {
	"[+] Preparing Qyrex environment... [OK]",
	"[+] Loading script modules... [OK]",
	"[+] Validating runtime configuration... [OK]",
	"[+] Synchronizing Qyrex services... [OK]",
	"[+] Optimizing execution state... [OK]",
	"[+] Finalizing launch sequence... [OK]"
}

local logLabel = makeText(
	terminal,
	"",
	12,
	COLORS.Gray
)

logLabel.Size = UDim2.new(
	1,
	-30,
	0,
	82
)

logLabel.Position = UDim2.new(
	0,
	15,
	0,
	274
)

logLabel.TextXAlignment = Enum.TextXAlignment.Left
logLabel.TextYAlignment = Enum.TextYAlignment.Top
logLabel.TextTransparency = 1

local progressBackground = Instance.new("Frame")
progressBackground.Name = "ProgressBackground"
progressBackground.Size = UDim2.new(
	1,
	-30,
	0,
	7
)

progressBackground.Position = UDim2.new(
	0,
	15,
	1,
	-44
)

progressBackground.BackgroundColor3 = Color3.fromRGB(
	28,
	28,
	34
)

progressBackground.BackgroundTransparency = 1
progressBackground.BorderSizePixel = 0
progressBackground.Parent = terminal

makeCorner(progressBackground, 20)

local progressFill = Instance.new("Frame")
progressFill.Name = "ProgressFill"
progressFill.Size = UDim2.new(
	0,
	0,
	1,
	0
)

progressFill.BackgroundColor3 = COLORS.Green
progressFill.BackgroundTransparency = 1
progressFill.BorderSizePixel = 0
progressFill.Parent = progressBackground

makeCorner(progressFill, 20)

local scan = Instance.new("Frame")
scan.Name = "Scan"
scan.Size = UDim2.new(
	0,
	70,
	1,
	0
)

scan.Position = UDim2.new(
	0,
	-80,
	0,
	0
)

scan.BackgroundColor3 = COLORS.White
scan.BackgroundTransparency = 0.9
scan.BorderSizePixel = 0
scan.Parent = progressBackground

local percentLabel = makeText(
	terminal,
	"0%",
	11,
	COLORS.Green
)

percentLabel.Size = UDim2.fromOffset(
	70,
	18
)

percentLabel.Position = UDim2.new(
	1,
	-85,
	1,
	-70
)

percentLabel.TextXAlignment = Enum.TextXAlignment.Right
percentLabel.TextTransparency = 1

tween(
	terminal,
	0.4,
	{
		BackgroundTransparency = 0
	},
	Enum.EasingStyle.Quart
)

tween(
	terminalStroke,
	0.4,
	{
		Transparency = 0
	},
	Enum.EasingStyle.Quart
)

tween(
	header,
	0.4,
	{
		BackgroundTransparency = 0
	}
)

tween(
	headerTitle,
	0.4,
	{
		TextTransparency = 0
	}
)

tween(
	statusLabel,
	0.4,
	{
		TextTransparency = 0
	}
)

tween(
	asciiLabel,
	0.4,
	{
		TextTransparency = 0
	}
)

tween(
	logLabel,
	0.4,
	{
		TextTransparency = 0
	}
)

tween(
	progressBackground,
	0.4,
	{
		BackgroundTransparency = 0
	}
)

tween(
	progressFill,
	0.4,
	{
		BackgroundTransparency = 0
	}
)

tween(
	percentLabel,
	0.4,
	{
		TextTransparency = 0
	}
)

local startTime = os.clock()

task.spawn(function()

	local typingStart = os.clock()

	for i = 1, #asciiArt do

		if not asciiLabel.Parent then
			return
		end

		asciiLabel.Text = string.sub(
			asciiArt,
			1,
			i
		)

		local expected =
			CONFIG.TypingDuration *
			(i / #asciiArt)

		local elapsed =
			os.clock() - typingStart

		local remaining =
			expected - elapsed

		if remaining > 0 then
			task.wait(remaining)
		end
	end

	local typingElapsed =
		os.clock() - typingStart

	if typingElapsed <
		CONFIG.TypingDuration then

		task.wait(
			CONFIG.TypingDuration -
			typingElapsed
		)
	end

	local currentLog = ""

	local logDelay =
		CONFIG.ProgressDuration /
		#logs

	for index, message in ipairs(logs) do

		if not terminal.Parent then
			return
		end

		currentLog =
			currentLog ..
			message ..
			"\n"

		logLabel.Text =
			currentLog

		local progress =
			index / #logs

		tween(
			progressFill,
			0.16,
			{
				Size = UDim2.new(
					progress,
					0,
					1,
					0
				)
			}
		)

		percentLabel.Text =
			math.floor(
				progress * 100
			) ..
			"%"

		if index <= 2 then

			statusLabel.Text =
				"[ SYSTEM ] Loading..."

			statusLabel.TextColor3 =
				COLORS.Green

		elseif index <= 4 then

			statusLabel.Text =
				"[ SYSTEM ] Optimizing..."

			statusLabel.TextColor3 =
				COLORS.Cyan

		else

			statusLabel.Text =
				"[ SYSTEM ] Finalizing..."

			statusLabel.TextColor3 =
				COLORS.Purple
		end

		task.wait(logDelay)
	end

	progressFill.Size =
		UDim2.new(
			1,
			0,
			1,
			0
		)

	percentLabel.Text = "100%"

	statusLabel.Text =
		"[ SYSTEM ] QYREX READY"

	statusLabel.TextColor3 =
		COLORS.Green

	task.spawn(function()

		while scan and scan.Parent do

			scan.Position =
				UDim2.new(
					0,
					-80,
					0,
					0
				)

			local scanAnimation =
				tween(
					scan,
					0.85,
					{
						Position =
							UDim2.new(
								1,
								0,
								0,
								0
							)
					},
					Enum.EasingStyle.Linear
				)

			scanAnimation.Completed:Wait()
		end
	end)

	for _ = 1, 3 do

		tween(
			percentLabel,
			0.12,
			{
				TextTransparency = 0.7
			}
		)

		task.wait(0.12)

		tween(
			percentLabel,
			0.12,
			{
				TextTransparency = 0
			}
		)

		task.wait(0.12)
	end

	while os.clock() - startTime < 6 do
		task.wait(0.02)
	end

	for _ = 1, 8 do

		if not terminal.Parent then
			break
		end

		terminal.Visible = false
		task.wait(0.05)

		terminal.Visible = true
		task.wait(0.06)
	end

	tween(
		terminal,
		0.3,
		{
			BackgroundTransparency = 1
		}
	)

	tween(
		terminalStroke,
		0.3,
		{
			Transparency = 1
		}
	)

	tween(
		header,
		0.3,
		{
			BackgroundTransparency = 1
		}
	)

	tween(
		headerTitle,
		0.3,
		{
			TextTransparency = 1
		}
	)

	tween(
		statusLabel,
		0.3,
		{
			TextTransparency = 1
		}
	)

	tween(
		asciiLabel,
		0.3,
		{
			TextTransparency = 1
		}
	)

	tween(
		logLabel,
		0.3,
		{
			TextTransparency = 1
		}
	)

	tween(
		progressBackground,
		0.3,
		{
			BackgroundTransparency = 1
		}
	)

	tween(
		progressFill,
		0.3,
		{
			BackgroundTransparency = 1
		}
	)

	tween(
		percentLabel,
		0.3,
		{
			TextTransparency = 1
		}
	)

	task.wait(0.3)

	if terminal and terminal.Parent then
		terminal:Destroy()
	end

	while os.clock() - startTime < CONFIG.TotalDuration do
		task.wait(0.02)
	end

	local watermark

	if CONFIG.ShowWatermark then

		watermark = Instance.new("Frame")
		watermark.Name = "QyrexWatermark"
		watermark.Size = UDim2.fromOffset(
			300,
			40
		)

		watermark.Position =
			UDim2.new(
				0,
				-320,
				0,
				CONFIG.WatermarkY
			)

		watermark.BackgroundColor3 =
			COLORS.Dark

		watermark.BackgroundTransparency =
			0.05

		watermark.BorderSizePixel =
			0

		watermark.Parent =
			screenGui

		makeCorner(
			watermark,
			10
		)

		local watermarkStroke =
			makeStroke(
				watermark,
				COLORS.Green,
				1,
				0.3
			)

		local indicator =
			Instance.new("Frame")

		indicator.Size =
			UDim2.fromOffset(
				3,
				19
			)

		indicator.Position =
			UDim2.new(
				0,
				7,
				0.5,
				-9
			)

		indicator.BackgroundColor3 =
			COLORS.Green

		indicator.BorderSizePixel =
			0

		indicator.Parent =
			watermark

		makeCorner(
			indicator,
			10
		)

		local dot =
			Instance.new("Frame")

		dot.Size =
			UDim2.fromOffset(
				6,
				6
			)

		dot.Position =
			UDim2.new(
				0,
				17,
				0.5,
				-3
			)

		dot.BackgroundColor3 =
			COLORS.Green

		dot.BorderSizePixel =
			0

		dot.Parent =
			watermark

		makeCorner(
			dot,
			20
		)

		local site =
			makeText(
				watermark,
				"qyrex.hopto.org",
				13,
				COLORS.Green
			)

		site.Size =
			UDim2.fromOffset(
				130,
				40
			)

		site.Position =
			UDim2.new(
				0,
				29,
				0,
				0
			)

		site.TextXAlignment =
			Enum.TextXAlignment.Left

		site.TextYAlignment =
			Enum.TextYAlignment.Center

		local ready =
			makeText(
				watermark,
				"READY",
				9,
				COLORS.Gray
			)

		ready.Size =
			UDim2.fromOffset(
				45,
				30
			)

		ready.Position =
			UDim2.new(
				0,
				155,
				0,
				5
			)

		ready.TextXAlignment =
			Enum.TextXAlignment.Center

		ready.TextYAlignment =
			Enum.TextYAlignment.Center

		local copyButton =
			Instance.new("TextButton")

		copyButton.Size =
			UDim2.fromOffset(
			80,
			28
			)

		copyButton.Position =
			UDim2.new(
				1,
				-88,
				0.5,
				-14
			)

		copyButton.BackgroundColor3 =
			COLORS.Panel2

		copyButton.BorderSizePixel =
			0

		copyButton.AutoButtonColor =
			false

		copyButton.Text =
			"▣  COPY"

		copyButton.TextSize =
			10

		copyButton.Font =
			Enum.Font.Code

		copyButton.TextColor3 =
			COLORS.Green

		copyButton.Parent =
			watermark

		makeCorner(
			copyButton,
			7
		)

		local copyStroke =
			makeStroke(
				copyButton,
				COLORS.Green,
				1,
				0.35
			)

		tween(
			watermark,
			0.65,
			{
				Position =
					UDim2.new(
						0,
						CONFIG.WatermarkX,
						0,
						CONFIG.WatermarkY
					)
			},
			Enum.EasingStyle.Quart
		)

		copyButton.MouseEnter:Connect(function()

			tween(
				copyButton,
				0.15,
				{
					BackgroundColor3 =
						COLORS.Panel3
				}
			)

			tween(
				copyStroke,
				0.15,
				{
					Transparency = 0
				}
			)
		end)

		copyButton.MouseLeave:Connect(function()

			tween(
				copyButton,
				0.15,
				{
					BackgroundColor3 =
						COLORS.Panel2
				}
			)

			tween(
				copyStroke,
				0.15,
				{
					Transparency = 0.35
				}
			)
		end)

		local copyBusy = false

		copyButton.MouseButton1Click:Connect(function()

			if copyBusy then
				return
			end

			copyBusy = true

			if copyText(CONFIG.Link) then

				copyButton.Text =
					"✓  COPIED"

				copyButton.TextColor3 =
					COLORS.Green

				task.wait(1)

				if copyButton.Parent then

					copyButton.Text =
						"▣  COPY"
				end

			else

				copyButton.Text =
					"✕  ERROR"

				copyButton.TextColor3 =
					Color3.fromRGB(
						255,
						80,
						80
					)

				task.wait(1)

				if copyButton.Parent then

					copyButton.Text =
						"▣  COPY"
				end
			end

			copyBusy = false
		end)

		local settingsButton =
			Instance.new("TextButton")

		settingsButton.Name =
			"SettingsButton"

		settingsButton.Size =
			UDim2.fromOffset(
				40,
				40
			)

		settingsButton.Position =
			UDim2.new(
				1,
				-55,
				0,
				CONFIG.WatermarkY
			)

		settingsButton.BackgroundColor3 =
			COLORS.Dark

		settingsButton.BackgroundTransparency =
			0.28

		settingsButton.BorderSizePixel =
			0

		settingsButton.AutoButtonColor =
			false

		settingsButton.Text =
			"⚙"

		settingsButton.TextSize =
			18

		settingsButton.Font =
			Enum.Font.Code

		settingsButton.TextColor3 =
			COLORS.Green

		settingsButton.Parent =
			screenGui

		makeCorner(
			settingsButton,
			10
		)

		local settingsStroke =
			makeStroke(
				settingsButton,
				COLORS.Green,
				1,
				0.4
			)

		local settingsPanel =
			Instance.new("Frame")

		settingsPanel.Name =
			"SettingsPanel"

		settingsPanel.Size =
			UDim2.fromOffset(
				410,
				505
			)

		settingsPanel.Position =
			UDim2.new(
				1,
				20,
				0.5,
				-252
			)

		settingsPanel.BackgroundColor3 =
			COLORS.Dark

		settingsPanel.BackgroundTransparency =
			0.02

		settingsPanel.BorderSizePixel =
			0

		settingsPanel.Visible =
			false

		settingsPanel.Parent =
			screenGui

		makeCorner(
			settingsPanel,
			14
		)

		local settingsStrokePanel =
			makeStroke(
				settingsPanel,
				COLORS.Green,
				1,
				0.3
			)

		local panelTitle =
			makeText(
				settingsPanel,
				"QYREX  //  CONTROL CENTER",
				14,
				COLORS.White
			)

		panelTitle.Size =
			UDim2.new(
				1,
				-60,
				0,
				42
			)

		panelTitle.Position =
			UDim2.new(
				0,
				18,
				0,
				0
			)

		panelTitle.TextXAlignment =
			Enum.TextXAlignment.Left

		panelTitle.TextYAlignment =
			Enum.TextYAlignment.Center

		local closeButton =
			Instance.new("TextButton")

		closeButton.Size =
			UDim2.fromOffset(
				32,
				32
			)

		closeButton.Position =
			UDim2.new(
				1,
				-42,
				0,
				5
			)

		closeButton.BackgroundTransparency =
			1

		closeButton.Text =
			"×"

		closeButton.TextSize =
			21

		closeButton.Font =
			Enum.Font.Code

		closeButton.TextColor3 =
			COLORS.Gray

		closeButton.Parent =
			settingsPanel

		local divider =
			Instance.new("Frame")

		divider.Size =
			UDim2.new(
				1,
				-36,
				0,
				1
			)

		divider.Position =
			UDim2.new(
				0,
				18,
				0,
				43
			)

		divider.BackgroundColor3 =
			COLORS.Panel3

		divider.BorderSizePixel =
			0

		divider.Parent =
			settingsPanel

		local scroll =
			Instance.new("ScrollingFrame")

		scroll.Size =
			UDim2.new(
				1,
				-20,
				1,
				-57
			)

		scroll.Position =
			UDim2.new(
				0,
				10,
				0,
				50
			)

		scroll.BackgroundTransparency =
			1

		scroll.BorderSizePixel =
			0

		scroll.ScrollBarThickness =
			3

		scroll.ScrollBarImageColor3 =
			COLORS.Green

		scroll.CanvasSize =
			UDim2.new(
				0,
				0,
				0,
				800
			)

		scroll.Parent =
			settingsPanel

		local padding =
			Instance.new("UIPadding")

		padding.PaddingLeft =
			UDim.new(
				0,
				8
			)

		padding.PaddingRight =
			UDim.new(
				0,
				8
			)

		padding.PaddingTop =
			UDim.new(
				0,
				6
			)

		padding.Parent =
			scroll

		local layout =
			Instance.new("UIListLayout")

		layout.Padding =
			UDim.new(
				0,
				9
			)

		layout.SortOrder =
			Enum.SortOrder.LayoutOrder

		layout.Parent =
			scroll

		local function section(text)

			local label =
				makeText(
					scroll,
					text,
					9,
					COLORS.Gray
				)

			label.Size =
				UDim2.new(
					1,
					0,
					0,
					20
				)

			label.TextXAlignment =
				Enum.TextXAlignment.Left
		end

		local function actionRow(
			titleText,
			valueText,
			color,
			actionText,
			callback
		)

			local row =
				Instance.new("Frame")

			row.Size =
				UDim2.new(
					1,
					0,
					0,
					50
				)

			row.BackgroundColor3 =
				COLORS.Panel2

			row.BorderSizePixel =
				0

			row.Parent =
				scroll

			makeCorner(
				row,
				9
			)

			local title =
				makeText(
					row,
					titleText,
					10,
					COLORS.White
				)

			title.Size =
				UDim2.new(
					1,
					-120,
					0,
					22
				)

			title.Position =
				UDim2.new(
					0,
					13,
					0,
					4
				)

			title.TextXAlignment =
				Enum.TextXAlignment.Left

			local value =
				makeText(
					row,
					valueText,
					8,
					COLORS.Gray
				)

			value.Size =
				UDim2.new(
					1,
					-120,
					0,
					18
				)

			value.Position =
				UDim2.new(
					0,
					13,
					0,
					26
				)

			value.TextXAlignment =
				Enum.TextXAlignment.Left

			local action =
				Instance.new("TextButton")

			action.Size =
				UDim2.fromOffset(
					76,
					29
				)

			action.Position =
				UDim2.new(
					1,
					-88,
					0.5,
					-14
				)

			action.BackgroundColor3 =
				COLORS.Panel3

			action.BorderSizePixel =
				0

			action.AutoButtonColor =
				false

			action.Text =
				actionText

			action.TextSize =
				9

			action.Font =
				Enum.Font.Code

			action.TextColor3 =
				color

			action.Parent =
				row

			makeCorner(
				action,
				6
			)

			local actionStroke =
				makeStroke(
					action,
					color,
					1,
					0.45
				)

			action.MouseEnter:Connect(function()

				tween(
					action,
					0.15,
					{
						BackgroundColor3 =
							COLORS.Panel3
					}
				)

				tween(
					actionStroke,
					0.15,
					{
						Transparency = 0
					}
				)
			end)

			action.MouseLeave:Connect(function()

				tween(
					actionStroke,
					0.15,
					{
						Transparency = 0.45
					}
				)
			end)

			action.MouseButton1Click:Connect(
				callback
			)

			return row
		end

		local function toggleRow(
			titleText,
			initial,
			callback,
			color
		)

			local state = initial

			local row =
				Instance.new("Frame")

			row.Size =
				UDim2.new(
					1,
					0,
					0,
					50
				)

			row.BackgroundColor3 =
				COLORS.Panel2

			row.BorderSizePixel =
				0

			row.Parent =
				scroll

			makeCorner(
				row,
				9
			)

			local title =
				makeText(
					row,
					titleText,
					10,
					COLORS.White
				)

			title.Size =
				UDim2.new(
					1,
					-100,
					1,
					0
				)

			title.Position =
				UDim2.new(
					0,
					13,
					0,
					0
				)

			title.TextXAlignment =
				Enum.TextXAlignment.Left

			title.TextYAlignment =
				Enum.TextYAlignment.Center

			local toggle =
				Instance.new("TextButton")

			toggle.Size =
				UDim2.fromOffset(
					60,
					28
				)

			toggle.Position =
				UDim2.new(
					1,
					-74,
					0.5,
					-14
				)

			toggle.BackgroundColor3 =
				state and color or COLORS.Muted

			toggle.BorderSizePixel =
				0

			toggle.AutoButtonColor =
				false

			toggle.Text =
				state and "ON" or "OFF"

			toggle.TextSize =
				9

			toggle.Font =
				Enum.Font.Code

			toggle.TextColor3 =
				COLORS.Dark

			toggle.Parent =
				row

			makeCorner(
				toggle,
				7
			)

			toggle.MouseButton1Click:Connect(function()

				state =
					not state

				callback(
					state
				)

				toggle.Text =
					state and "ON" or "OFF"

				tween(
					toggle,
					0.18,
					{
						BackgroundColor3 =
							state and color or COLORS.Muted
					}
				)
			end)
		end

		section("QUICK ACCESS")

		actionRow(
			"Website",
			CONFIG.Link,
			COLORS.Cyan,
			"▣ COPY",
			function()
				local ok =
					copyText(
						CONFIG.Link
					)

				if ok then
				
				end
			end
		)

		actionRow(
			"Discord",
			CONFIG.Discord,
			COLORS.Purple,
			"▣ COPY",
			function()
				copyText(
					CONFIG.Discord
				)
			end
		)

		section("LOADER")

		toggleRow(
			"Animations",
			CONFIG.Animations,
			function(value)
				CONFIG.Animations =
					value
			end,
			COLORS.Green
		)

		toggleRow(
			"Dynamic colors",
			CONFIG.ColorChanging,
			function(value)
				CONFIG.ColorChanging =
					value
			end,
			COLORS.Cyan
		)

		toggleRow(
			"Watermark",
			CONFIG.ShowWatermark,
			function(value)
				CONFIG.ShowWatermark =
					value

				if watermark then
					watermark.Visible =
						value
				end
			end,
			COLORS.Purple
		)

		section("VIP PLANS")

		local vipPlans = {
			{
				name = "VIP STARTER",
				price = "30",
				desc = "Basic premium access",
				color = COLORS.Green
			},
			{
				name = "VIP PRO",
				price = "150",
				desc = "Advanced premium access",
				color = COLORS.Cyan
			},
			{
				name = "VIP ULTIMATE",
				price = "500",
				desc = "Maximum premium access",
				color = COLORS.Purple
			}
		}

		for _, plan in ipairs(vipPlans) do

			local card =
				Instance.new("Frame")

			card.Size =
				UDim2.new(
					1,
					0,
					0,
					67
				)

			card.BackgroundColor3 =
				COLORS.Panel2

			card.BorderSizePixel =
				0

			card.Parent =
				scroll

			makeCorner(
				card,
				9
			)

			makeStroke(
				card,
				plan.color,
				1,
				0.5
			)

			local planName =
				makeText(
					card,
					plan.name,
					10,
					plan.color
				)

			planName.Size =
				UDim2.new(
					1,
					-100,
					0,
					22
				)

			planName.Position =
				UDim2.new(
					0,
					12,
					0,
					7
				)

			planName.TextXAlignment =
				Enum.TextXAlignment.Left

			local desc =
				makeText(
					card,
					plan.desc,
					8,
					COLORS.Gray
				)

			desc.Size =
				UDim2.new(
					1,
					-100,
					0,
					17
				)

			desc.Position =
				UDim2.new(
					0,
					12,
					0,
					31
				)

			desc.TextXAlignment =
				Enum.TextXAlignment.Left

			local price =
				makeText(
					card,
					plan.price,
					18,
					plan.color
				)

			price.Size =
				UDim2.fromOffset(
					60,
					32
				)

			price.Position =
				UDim2.new(
					1,
					-72,
					0,
					5
				)

			price.TextXAlignment =
				Enum.TextXAlignment.Center

			price.TextYAlignment =
				Enum.TextYAlignment.Center
		end

		section("UTILITY")

		actionRow(
			"Copy website",
			"qyrex.hopto.org",
			COLORS.Green,
			"COPY",
			function()
				copyText(
					CONFIG.Link
				)
			end
		)

		actionRow(
			"Copy Discord",
			"YzCsksufde",
			COLORS.Purple,
			"COPY",
			function()
				copyText(
					CONFIG.Discord
				)
			end
		)

		local panelOpen = false

		local function openSettings()

			panelOpen = true

			settingsPanel.Visible =
				true

			settingsPanel.Position =
				UDim2.new(
					1,
					20,
					0.5,
					-252
				)

			tween(
				settingsPanel,
				0.3,
				{
					Position =
						UDim2.new(
							1,
							-425,
							0.5,
							-252
						)
				},
				Enum.EasingStyle.Quart
			)
		end

		local function closeSettings()

			panelOpen = false

			tween(
				settingsPanel,
				0.25,
				{
					Position =
						UDim2.new(
							1,
							20,
							0.5,
							-252
						)
				},
				Enum.EasingStyle.Quart
			)

			task.wait(0.25)

			if not panelOpen and settingsPanel.Parent then
				settingsPanel.Visible =
					false
			end
		end

		settingsButton.MouseEnter:Connect(function()

			tween(
				settingsButton,
				0.15,
				{
					BackgroundTransparency = 0.08,
					Rotation = 25
				}
			)

			tween(
				settingsStroke,
				0.15,
				{
					Transparency = 0
				}
			)
		end)

		settingsButton.MouseLeave:Connect(function()

			tween(
				settingsButton,
				0.15,
				{
					BackgroundTransparency = 0.28,
					Rotation = 0
				}
			)

			tween(
				settingsStroke,
				0.15,
				{
					Transparency = 0.4
				}
			)
		end)

		settingsButton.MouseButton1Click:Connect(function()

			if panelOpen then
				closeSettings()
			else
				openSettings()
			end
		end)

		closeButton.MouseButton1Click:Connect(
			closeSettings
		)

		task.spawn(function()

			local colors = {
				COLORS.Green,
				COLORS.Cyan,
				COLORS.Purple,
				COLORS.Pink,
				COLORS.Orange
			}

			local index = 1

			while screenGui and screenGui.Parent do

				if CONFIG.ColorChanging then

					local color =
						colors[index]

					tween(
						watermarkStroke,
						0.2,
						{
							Color = color
						}
					)

					tween(
						indicator,
						0.2,
						{
							BackgroundColor3 =
								color
						}
					)

					tween(
						dot,
						0.2,
						{
							BackgroundColor3 =
								color
						}
					)

					tween(
						site,
						0.2,
						{
							TextColor3 =
								color
						}
					)

					tween(
						settingsButton,
						0.2,
						{
							TextColor3 =
								color
						}
					)

					tween(
						settingsStroke,
						0.2,
						{
							Color =
								color
						}
					)

					tween(
						settingsStrokePanel,
						0.2,
						{
							Color =
								color
						}
					)

					if not copyBusy then

						tween(
							copyButton,
							0.2,
							{
								TextColor3 =
									color
							}
						)

						tween(
							copyStroke,
							0.2,
							{
								Color =
									color
							}
						)
					end
				end

				index += 1

				if index > #colors then
					index = 1
				end

				task.wait(
					CONFIG.ColorCycle
				)
			end
		end)

		task.spawn(function()

			while dot and dot.Parent do

				tween(
					dot,
					0.7,
					{
						BackgroundTransparency =
							0.65
					},
					Enum.EasingStyle.Sine,
					Enum.EasingDirection.InOut
				)

				task.wait(0.7)

				if not dot.Parent then
					break
				end

				tween(
					dot,
					0.7,
					{
						BackgroundTransparency =
							0
					},
					Enum.EasingStyle.Sine,
					Enum.EasingDirection.InOut
				)

				task.wait(0.7)
			end
		end)
	end
end)
end)
-- ==================== END QYREX TERMINAL UI ====================

-- Runtime hardening heuristics. These are intentionally conservative:
-- the presence of one executor API alone is not enough to abort.
local function suspiciousEnvironment()
    local score = 0

    local probes = {
        "hookfunction",
        "hookmetamethod",
        "getrawmetatable",
        "getconnections",
        "getgc",
        "getreg",
        "getupvalues",
        "getconstant",
        "getconstants",
        "setreadonly",
        "iscclosure",
    }

    local g = getfenv and getfenv(0) or _G
    for _, name in ipairs(probes) do
        if type(g[name]) == "function" then
            score += 1
        end
    end

    -- The loader itself must have a callable loadstring/load function.
    local loader = loadstring or load
    if type(loader) ~= "function" then
        return true
    end

    -- A light integrity canary. Do not rely on this as a complete hook detector.
    local ok, result = pcall(function()
        local fn = function(x) return x + 7 end
        local a = fn(5)
        return a == 12
    end)
    if not ok or result ~= true then
        score += 3
    end

    -- Multiple inspection primitives at once are a stronger signal.
    return score >= 4
end

if suspiciousEnvironment() then
    return decoy()
end

local function b64decode(s)
    if type(Crypt.base64decode) == "function" then
        return Crypt.base64decode(s)
    end
    if type(Crypt.base64) == "table" and type(Crypt.base64.decode) == "function" then
        return Crypt.base64.decode(s)
    end
    error("QyrexApi: base64 decoder missing")
end

local function sha256hex(data)
    if type(Crypt.hash) == "function" then
        local ok, out = pcall(Crypt.hash, "sha256", data)
        if ok and type(out) == "string" then
            return out:gsub("%s+", ""):lower()
        end
    end
    if type(Crypt.hash) == "table" and type(Crypt.hash.sha256) == "function" then
        local ok, out = pcall(Crypt.hash.sha256, data)
        if ok and type(out) == "string" then
            return out:gsub("%s+", ""):lower()
        end
    end
    error("QyrexApi: sha256 is unavailable in this environment")
end

local function requireEq(a, b)
    if type(a) ~= "string" or type(b) ~= "string" then
        return false
    end
    return a:lower() == b:lower()
end

-- AES-256-GCM compatibility adapter.
-- Supported shapes:
--   crypt.decrypt(ciphertext, key, iv, "aes-gcm", tag)
--   crypt.decrypt(ciphertext, key, iv, tag, "aes-256-gcm")
--   crypt.aes_gcm_decrypt(ciphertext, key, iv, tag, aad)
local function aesGcmDecrypt(ciphertext, key, iv, tag, aad)
    if type(Crypt.aes_gcm_decrypt) == "function" then
        local ok, out = pcall(Crypt.aes_gcm_decrypt, ciphertext, key, iv, tag, aad)
        if ok and type(out) == "string" then return out end
    end

    if type(Crypt.decrypt) == "function" then
        local attempts = {
            function() return Crypt.decrypt(ciphertext, key, iv, "aes-gcm", tag, aad) end,
            function() return Crypt.decrypt(ciphertext, key, iv, tag, "aes-256-gcm", aad) end,
            function() return Crypt.decrypt(ciphertext, key, iv, "AES-256-GCM", tag, aad) end,
        }
        for _, attempt in ipairs(attempts) do
            local ok, out = pcall(attempt)
            if ok and type(out) == "string" then return out end
        end
    end

    error("QyrexApi: AES-256-GCM is unavailable or has an incompatible API")
end

local function xorBytes(data, key)
    local out = table.create(#data)
    local klen = #key
    for i = 1, #data do
        local a = string.byte(data, i)
        local b = string.byte(key, ((i - 1) % klen) + 1)
        out[i] = string.char(bit32.bxor(a, b))
    end
    return table.concat(out)
end

local function deriveChunkKey(sessionKey, salt)
    -- Preferred: HKDF-SHA256 in newer crypt providers.
    if type(Crypt.hkdf) == "function" then
        local ok, out = pcall(Crypt.hkdf, "sha256", sessionKey, salt, "QyrexApi/A-D/v3/chunk", 32)
        if ok and type(out) == "string" then return out end
    end

    -- Fallback for environments exposing only HMAC/SHA-256.
    if type(Crypt.hmac) == "function" then
        local ok, out = pcall(Crypt.hmac, "sha256", sessionKey, salt .. "QyrexApi/A-D/v3/chunk")
        if ok and type(out) == "string" then
            if #out >= 32 then return out:sub(1, 32) end
        end
    end

    error("QyrexApi: HKDF/HMAC support is unavailable")
end

local function maskKey(sessionKey, salt)
    local digest = sha256hex(sessionKey .. salt)
    -- If hash returns hex, convert it to bytes for XOR.
    local bytes = {}
    for i = 1, #digest, 2 do
        bytes[#bytes + 1] = string.char(tonumber(digest:sub(i, i + 1), 16))
    end
    return table.concat(bytes)
end

local function httpJson(url, body)
    local ok, response = pcall(HttpRequest, {
        Url = url,
        Method = "POST",
        Headers = {
            ["Content-Type"] = "application/json",
            ["Cache-Control"] = "no-store",
            ["X-Requested-With"] = "QyrexApi-Luau",
        },
        Body = game:GetService("HttpService"):JSONEncode(body),
    })
    if not ok or type(response) ~= "table" or type(response.Body) ~= "string" then
        return nil
    end
    if response.StatusCode and response.StatusCode ~= 200 then
        return nil
    end
    local okDecode, decoded = pcall(function()
        return game:GetService("HttpService"):JSONDecode(response.Body)
    end)
    if not okDecode or type(decoded) ~= "table" then
        return nil
    end
    return decoded
end

local function runProtected()
    local handshake = httpJson(API .. "/api/v3/handshake", {
        scriptId = SCRIPT_ID,
        key = KEY,
    })
    if not handshake then
        return decoy()
    end

    local sessionId = handshake.sessionId
    local sessionKeyB64 = handshake.sessionKey
    local challenge = handshake.firstChallenge
    local total = tonumber(handshake.total)

    if type(sessionId) ~= "string" or type(sessionKeyB64) ~= "string" or type(challenge) ~= "string" or type(total) ~= "number" then
        return decoy()
    end

    local sessionKey = b64decode(sessionKeyB64)
    local realParts = table.create(total)
    local received = 0

    for _ = 1, total + 2 do
        if received >= total then break end
        if suspiciousEnvironment() then return decoy() end

        local packet = httpJson(API .. "/api/v3/chunk", {
            sessionId = sessionId,
            challenge = challenge,
        })
        if not packet then
            return decoy()
        end

        if packet.done then
            break
        end

        local cursor = tonumber(packet.cursor)
        local packetType = packet.type
        local packetIndex = tonumber(packet.index)
        if cursor == nil or (packetType ~= "real" and packetType ~= "decoy") then
            return decoy()
        end
        if type(packet.ciphertext) ~= "string" or type(packet.sha256) ~= "string" then
            return decoy()
        end

        local encodedCipher = packet.ciphertext
        if type(packet.ciphertextSha256) ~= "string" or not requireEq(sha256hex(b64decode(encodedCipher)), packet.ciphertextSha256) then
            return decoy()
        end

        local salt = b64decode(packet.salt)
        local iv = b64decode(packet.iv)
        local tag = b64decode(packet.tag)
        local aad = b64decode(packet.aad)
        local maskedCipher = b64decode(packet.ciphertext)

        local mask = maskKey(sessionKey, salt)
        local ciphertext = xorBytes(maskedCipher, mask)
        local key = deriveChunkKey(sessionKey, salt)
        local plaintext
        local okDecrypt, result = pcall(function()
            return aesGcmDecrypt(ciphertext, key, iv, tag, aad)
        end)
        if not okDecrypt or type(result) ~= "string" then
            return decoy()
        end

        if not requireEq(sha256hex(result), packet.sha256) then
            return decoy()
        end

        if packetType == "real" and packetIndex and packetIndex >= 0 then
            realParts[packetIndex + 1] = result
        end

        received += 1
        challenge = packet.challenge
    end

    local assembled = {}
    local expectedReal = tonumber(handshake.realCount)
    if not expectedReal or expectedReal < 1 then
        return decoy()
    end
    for i = 1, expectedReal do
        local piece = realParts[i]
        if type(piece) ~= "string" then
            return decoy()
        end
        assembled[#assembled + 1] = piece
    end

    local finalSource = table.concat(assembled)
    if type(handshake.sourceSha256) ~= "string" or not requireEq(sha256hex(finalSource), handshake.sourceSha256) then
        return decoy()
    end

    local loadFn = loadstring or load
    if type(loadFn) ~= "function" then
        return decoy()
    end

    local fn
    local okLoad, loadResult = pcall(function()
        return loadFn(finalSource, "QyrexProtected")
    end)
    if not okLoad or type(loadResult) ~= "function" then
        return decoy()
    end
    fn = loadResult

    -- Run in a constrained environment where the Luau implementation allows it.
    if type(setfenv) == "function" then
        local safeEnv = {
            game = game,
            workspace = workspace,
            Players = Players,
            print = print,
            warn = warn,
            pairs = pairs,
            ipairs = ipairs,
            next = next,
            type = type,
            tostring = tostring,
            tonumber = tonumber,
            string = string,
            table = table,
            math = math,
            coroutine = coroutine,
            task = task,
        }
        setfenv(fn, setmetatable(safeEnv, { __index = _G }))
    end

    local okRun = pcall(fn)
    if not okRun then
        return decoy()
    end
    return true
end

return runProtected()
