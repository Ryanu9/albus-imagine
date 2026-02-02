import {
	App,
	Component,
	Editor,
	MarkdownView,
	Menu,
	Notice,
	Platform,
	TFile,
	View,
} from "obsidian";
import type AlbusImaginePlugin from "../main";
import type { ImageManagerSettings } from "../types/image-manager.types";

interface ImageMatch {
	lineNumber: number;
	line: string;
	fullMatch: string;
}

type FileExplorerView = { revealInFolder?: (file: TFile) => void };

export class ImageContextMenu extends Component {
	private app: App;
	private plugin: AlbusImaginePlugin;
	private settings: ImageManagerSettings;
	private contextMenuRegistered = false;
	private currentMenu: Menu | null = null;

	constructor(
		app: App,
		plugin: AlbusImaginePlugin,
		settings: ImageManagerSettings
	) {
		super();
		this.app = app;
		this.plugin = plugin;
		this.settings = settings;
	}

	registerContextMenuListener(): void {
		if (this.contextMenuRegistered) return;

		this.registerDomEvent(
			document,
			"contextmenu",
			this.handleContextMenuEvent,
			true
		);
		this.contextMenuRegistered = true;
	}

	private handleContextMenuEvent = (event: MouseEvent): void => {
		try {
			const target = event.target;
			if (!target || !(target instanceof HTMLElement)) return;

			// 检查是否在 Canvas 中
			const currentView = this.app.workspace.getActiveViewOfType(View);
			if (currentView?.getViewType() === "canvas") return;

			const img = target instanceof HTMLImageElement ? target : target.closest("img");
			if (!img) return;

			// 仅在编辑模式下工作
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView || activeView.getMode() !== 'source') return;

			// 检查是否在编辑器容器中
			if (!img.closest(".markdown-source-view")) return;

			event.preventDefault();
			event.stopPropagation();

			const menu = new Menu();
			this.createContextMenuItems(menu, img, event);
			menu.showAtMouseEvent(event);
		} catch (error) {
			console.error('[ImageContextMenu] Error:', error);
		}
	};

	private createContextMenuItems(menu: Menu, img: HTMLImageElement, event: MouseEvent): void {
		this.currentMenu = menu;

		// 图片对齐
		this.addAlignmentSubmenu(menu, img);
		menu.addSeparator();

		// 图片反色
		this.addDarkModeMenuItem(menu, img);
		menu.addSeparator();

		// 复制路径
		this.addCopyPathMenuItem(menu, img);
		menu.addSeparator();

		// 复制图片
		this.addCopyImageMenuItem(menu, event);
		menu.addSeparator();

		// 删除链接
		this.addDeleteLinkMenuItem(menu, img);
		menu.addSeparator();

		// 文件操作
		if (!Platform.isMobile) {
			this.addShowInNavigationMenuItem(menu, img);
			this.addShowInSystemExplorerMenuItem(menu, img);
		}
	}

	private addAlignmentSubmenu(menu: Menu, img: HTMLImageElement): void {
		menu.addItem((item) => {
			item.setTitle("图片对齐").setIcon("align-left");
			const submenu = (item as any).setSubmenu() as Menu;

			submenu.addItem((subItem) => {
				subItem.setTitle("居中").setIcon("align-center");
				subItem.onClick(() => this.updateAlignment(img, "center"));
			});

			submenu.addItem((subItem) => {
				subItem.setTitle("左侧环绕").setIcon("align-left");
				subItem.onClick(() => this.updateAlignment(img, "left"));
			});

			submenu.addItem((subItem) => {
				subItem.setTitle("右侧环绕").setIcon("align-right");
				subItem.onClick(() => this.updateAlignment(img, "right"));
			});
		});
	}

	private addDarkModeMenuItem(menu: Menu, img: HTMLImageElement): void {
		menu.addItem((item) => {
			item.setTitle("深色反色")
				.setIcon("moon")
				.onClick(() => this.toggleDarkMode(img));
		});
	}

	private getCurrentAlignment(img: HTMLImageElement): "center" | "left" | "right" {
		const src = img.getAttribute("src") || "";
		
		// 从 src 中检查 # 语法：image#center 或 image#center#dark
		if (src.includes("#")) {
			const hashParts = src.split("#");
			for (const part of hashParts) {
				if (part === "center" || part === "left" || part === "right") {
					return part as "center" | "left" | "right";
				}
			}
		}

		// 从 alt 中检查 | 语法
		const alt = img.getAttribute("alt") || "";
		if (alt.includes("|")) {
			const parts = alt.split("|");
			for (const part of parts) {
				const trimmed = part.trim();
				if (trimmed === "center" || trimmed === "left" || trimmed === "right") {
					return trimmed as "center" | "left" | "right";
				}
			}
		}

		// 默认居中
		return "center";
	}

	private isDarkMode(img: HTMLImageElement): boolean {
		const src = img.getAttribute("src") || "";
		const alt = img.getAttribute("alt") || "";
		
		// 检查 # 语法中的 dark
		if (src.includes("#dark")) return true;
		
		// 检查 | 语法中的 dark
		if (alt.includes("|dark|") || alt.includes("|dark]")) return true;
		
		return false;
	}

	private async updateAlignment(img: HTMLImageElement, alignment: "center" | "left" | "right"): Promise<void> {
		const imagePath = this.getImagePath(img);
		if (!imagePath) {
			new Notice("无法获取图片路径");
			return;
		}

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice("请在编辑模式下使用");
			return;
		}

		const editor = activeView.editor;
		const match = await this.findSingleImageMatch(editor, imagePath, img);
		if (!match) {
			new Notice("未找到图片链接");
			return;
		}

		const newLink = this.updateLinkAlignment(match.fullMatch, alignment);
		const line = editor.getLine(match.lineNumber);
		const newLine = line.replace(match.fullMatch, newLink);
		editor.setLine(match.lineNumber, newLine);

		new Notice(`对齐: ${alignment}`);
	}

	private async toggleDarkMode(img: HTMLImageElement): Promise<void> {
		const imagePath = this.getImagePath(img);
		if (!imagePath) {
			new Notice("无法获取图片路径");
			return;
		}

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice("请在编辑模式下使用");
			return;
		}

		const editor = activeView.editor;
		const match = await this.findSingleImageMatch(editor, imagePath, img);
		if (!match) {
			new Notice("未找到图片链接");
			return;
		}

		// 基于当前链接内容判断是否有dark参数
		const currentHasDark = match.fullMatch.includes("#dark") || match.fullMatch.includes("|dark|") || match.fullMatch.includes("|dark]");
		const newLink = this.updateLinkDarkMode(match.fullMatch, !currentHasDark);
		const line = editor.getLine(match.lineNumber);
		const newLine = line.replace(match.fullMatch, newLink);
		editor.setLine(match.lineNumber, newLine);

		new Notice(currentHasDark ? "已取消反色" : "已启用反色");
	}

	/**
	 * 更新链接的对齐参数
	 * 支持格式：
	 * - ![[image|dark|center|size]] -> | 语法
	 * - ![[image#center#dark|title|size]] -> # 语法（带标题）
	 * - ![[image#center|title|size]] -> # 语法（带标题）
	 */
	private updateLinkAlignment(link: string, alignment: "center" | "left" | "right"): string {
		if (!link.startsWith("![[") || !link.endsWith("]]")) {
			return link;
		}

		const inner = link.slice(3, -2); // 移除 ![[  和 ]]
		const parts = inner.split("|");
		const imagePath = parts[0];

		// 判断是否使用 # 语法（有标题）
		const hasHashSyntax = imagePath.includes("#");

		if (hasHashSyntax) {
			// # 语法：image#position[#dark]
			const hashParts = imagePath.split("#");
			const baseImage = hashParts[0];
			const hasDark = hashParts.includes("dark");
			
			// 重建图片路径部分
			const newImagePath = hasDark ? `${baseImage}#${alignment}#dark` : `${baseImage}#${alignment}`;
			
			// 保留标题和尺寸
			const otherParts = parts.slice(1);
			if (otherParts.length > 0) {
				return `![[${newImagePath}|${otherParts.join("|")}]]`;
			} else {
				return `![[${newImagePath}]]`;
			}
		} else {
			// | 语法：image|[dark|]position|[size]
			const hasDark = parts.some(p => p.trim() === "dark");
			const sizeIndex = parts.findIndex(p => /^\d+$/.test(p.trim()));
			const size = sizeIndex > 0 ? parts[sizeIndex].trim() : null;

			// 重建链接
			let newParts = [imagePath];
			if (hasDark) newParts.push("dark");
			newParts.push(alignment);
			if (size) newParts.push(size);

			return `![[${newParts.join("|")}]]`;
		}
	}

	/**
	 * 更新链接的 dark 参数
	 */
	private updateLinkDarkMode(link: string, enableDark: boolean): string {
		if (!link.startsWith("![[") || !link.endsWith("]]")) {
			return link;
		}

		const inner = link.slice(3, -2);
		const parts = inner.split("|");
		const imagePath = parts[0];

		// 判断是否使用 # 语法
		const hasHashSyntax = imagePath.includes("#");

		if (hasHashSyntax) {
			// # 语法
			const hashParts = imagePath.split("#");
			const baseImage = hashParts[0];
			const position = hashParts.find(p => ["center", "left", "right"].includes(p)) || "center";
			
			const newImagePath = enableDark ? `${baseImage}#${position}#dark` : `${baseImage}#${position}`;
			const otherParts = parts.slice(1);
			
			if (otherParts.length > 0) {
				return `![[${newImagePath}|${otherParts.join("|")}]]`;
			} else {
				return `![[${newImagePath}]]`;
			}
		} else {
			// | 语法
			const position = parts.find(p => ["center", "left", "right"].includes(p.trim())) || "center";
			const sizeIndex = parts.findIndex(p => /^\d+$/.test(p.trim()));
			const size = sizeIndex > 0 ? parts[sizeIndex].trim() : null;

			let newParts = [imagePath];
			if (enableDark) newParts.push("dark");
			newParts.push(position);
			if (size) newParts.push(size);

			return `![[${newParts.join("|")}]]`;
		}
	}

	private addCopyPathMenuItem(menu: Menu, img: HTMLImageElement): void {
		menu.addItem((item) => {
			item.setTitle("复制图片路径").setIcon("link").onClick(async () => {
				const imagePath = this.getImagePath(img);
				if (!imagePath) {
					new Notice("无法获取图片路径");
					return;
				}

				await navigator.clipboard.writeText(imagePath);
				new Notice("路径已复制");
			});
		});
	}

	private addCopyImageMenuItem(menu: Menu, event: MouseEvent): void {
		menu.addItem((item) => {
			item.setTitle("复制图片").setIcon("copy").onClick(async () => {
				const targetImg = event.target as HTMLImageElement;
				const img = new Image();
				img.crossOrigin = "anonymous";

				img.onload = async () => {
					try {
						const canvas = document.createElement("canvas");
						canvas.width = img.naturalWidth;
						canvas.height = img.naturalHeight;
						const ctx = canvas.getContext("2d");
						if (!ctx) return;

						ctx.drawImage(img, 0, 0);
						const blob = await new Promise<Blob>((resolve, reject) => {
							canvas.toBlob((b) => b ? resolve(b) : reject(), "image/png");
						});

						await navigator.clipboard.write([
							new ClipboardItem({ [blob.type]: blob })
						]);
						new Notice("图片已复制");
					} catch (error) {
						new Notice("复制失败");
					}
				};

				img.src = targetImg.src;
			});
		});
	}

	private addDeleteLinkMenuItem(menu: Menu, img: HTMLImageElement): void {
		menu.addItem((item) => {
			item.setTitle("删除链接").setIcon("trash").onClick(async () => {
				const imagePath = this.getImagePath(img);
				if (!imagePath) {
					new Notice("无法获取图片路径");
					return;
				}

				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView) return;

				const editor = activeView.editor;
				const match = await this.findSingleImageMatch(editor, imagePath, img);
				if (!match) {
					new Notice("未找到图片链接");
					return;
				}

				this.removeImageLink(editor, match);
				new Notice("链接已删除");
			});
		});
	}

	private addShowInNavigationMenuItem(menu: Menu, img: HTMLImageElement): void {
		menu.addItem((item) => {
			item.setTitle("在文件管理器中显示").setIcon("folder-open").onClick(async () => {
				const imagePath = this.getImagePath(img);
				if (!imagePath) {
					new Notice("无法获取图片路径");
					return;
				}

				const file = this.app.vault.getAbstractFileByPath(imagePath);
				if (!(file instanceof TFile)) {
					new Notice("文件不存在");
					return;
				}

				// 获取或创建文件管理器视图
				let fileExplorerLeaf = this.app.workspace.getLeavesOfType("file-explorer")[0];
				if (!fileExplorerLeaf) {
					const newLeaf = this.app.workspace.getLeftLeaf(false);
					if (newLeaf) {
						await newLeaf.setViewState({ type: "file-explorer" });
						fileExplorerLeaf = newLeaf;
					}
				}

				if (fileExplorerLeaf) {
					// 展开左侧边栏
					const leftSplit = this.app.workspace.leftSplit;
					if (leftSplit && leftSplit.collapsed) {
						// @ts-ignore
						leftSplit.toggle();
					}

					// 在文件管理器中定位文件
					const view = fileExplorerLeaf.view as FileExplorerView;
					if (view.revealInFolder) {
						view.revealInFolder(file);
						new Notice("已在文件管理器中定位");
					}
				}
			});
		});
	}

	private addShowInSystemExplorerMenuItem(menu: Menu, img: HTMLImageElement): void {
		menu.addItem((item) => {
			item.setTitle("在系统资源管理器中显示").setIcon("folder").onClick(async () => {
				const imagePath = this.getImagePath(img);
				if (!imagePath) {
					new Notice("无法获取图片路径");
					return;
				}

				const file = this.app.vault.getAbstractFileByPath(imagePath);
				if (!(file instanceof TFile)) {
					new Notice("文件不存在");
					return;
				}

				try {
					// @ts-ignore - showInFolder is an internal API
					this.app.showInFolder(file.path);
					new Notice("已打开系统资源管理器");
				} catch (error) {
					console.error("Failed to show in system explorer:", error);
					new Notice("打开系统资源管理器失败");
				}
			});
		});
	}

	private getImagePath(img: HTMLImageElement): string | null {
		const src = img.getAttribute("src");
		if (!src) return null;

		try {
			// 方法1: 直接尝试作为相对路径
			let file = this.app.vault.getAbstractFileByPath(src);
			if (file instanceof TFile) return file.path;

			// 方法2: 处理 app:// 协议
			if (src.startsWith("app://")) {
				try {
					const url = new URL(src);
					let decodedPath = decodeURIComponent(url.pathname);
					
					// 移除开头的斜杠
					if (decodedPath.startsWith('/')) {
						decodedPath = decodedPath.substring(1);
					}
					
					// 尝试从 vault 名称后开始的路径
					const pathParts = decodedPath.split('/');
					if (pathParts.length > 1) {
						// 去掉第一个部分（vault名称）
						const vaultRelativePath = pathParts.slice(1).join('/');
						file = this.app.vault.getAbstractFileByPath(vaultRelativePath);
						if (file instanceof TFile) return file.path;
					}
					
					// 直接尝试完整解码路径
					file = this.app.vault.getAbstractFileByPath(decodedPath);
					if (file instanceof TFile) return file.path;
				} catch (e) {
					console.warn("Failed to parse app:// URL:", e);
				}
			}

			// 方法3: 尝试文件名匹配
			const fileName = src.split('/').pop();
			if (fileName) {
				const decodedFileName = decodeURIComponent(fileName).toLowerCase();
				const files = this.app.vault.getFiles();
				
				// 精确匹配（不区分大小写）
				const exactMatch = files.find(f => 
					f.name.toLowerCase() === decodedFileName
				);
				if (exactMatch) return exactMatch.path;
				
				// 如果文件名包含特殊字符，尝试匹配基础名称
				const baseFileName = decodedFileName.split('?')[0].split('#')[0];
				const baseMatch = files.find(f => 
					f.name.toLowerCase() === baseFileName
				);
				if (baseMatch) return baseMatch.path;
			}

			// 方法4: 从图片的父级元素获取信息
			const parentEmbed = img.closest('.internal-embed');
			if (parentEmbed) {
				const embedSrc = parentEmbed.getAttribute('src');
				if (embedSrc) {
					file = this.app.vault.getAbstractFileByPath(embedSrc);
					if (file instanceof TFile) return file.path;
				}
			}

			console.warn("Could not resolve image path from src:", src);
			return null;
		} catch (error) {
			console.error("Error getting image path:", error);
			return null;
		}
	}

	private async findSingleImageMatch(
		editor: Editor,
		imagePath: string,
		img?: HTMLImageElement
	): Promise<ImageMatch | null> {
		const matches = await this.findImageMatches(editor, imagePath);
		if (matches.length === 0) return null;
		if (matches.length === 1) return matches[0];

		// 多个匹配时，通过 DOM 位置定位
		if (img) {
			try {
				// @ts-ignore - CodeMirror 6 API
				const editorView = editor.cm;
				if (editorView?.posAtDOM) {
					// 获取光标在文档中的位置
					const imgPos = editorView.posAtDOM(img);
					if (imgPos !== null && imgPos !== undefined) {
						// @ts-ignore
						const lineObj = editorView.state.doc.lineAt(imgPos);
						const targetLine = lineObj.number - 1; // 转换为 0-based

						// 精确匹配行号
						const exactMatch = matches.find(m => m.lineNumber === targetLine);
						if (exactMatch) return exactMatch;

						// 找最接近的行
						let closestMatch = matches[0];
						let minDistance = Math.abs(matches[0].lineNumber - targetLine);
						
						for (const match of matches) {
							const distance = Math.abs(match.lineNumber - targetLine);
							if (distance < minDistance) {
								minDistance = distance;
								closestMatch = match;
							}
						}
						
						// 只有当距离合理时才返回最接近的匹配（例如 5 行以内）
						if (minDistance <= 5) {
							return closestMatch;
						}
					}
				}
			} catch (e) {
				console.warn("Failed to get position from DOM:", e);
			}
		}

		// Fallback: 返回第一个匹配
		return matches[0];
	}

	private async findImageMatches(editor: Editor, imagePath: string): Promise<ImageMatch[]> {
		const matches: ImageMatch[] = [];
		const lineCount = editor.lineCount();
		
		// 提取文件名和基础名称用于匹配
		const fileName = imagePath.split('/').pop()?.toLowerCase() || '';
		const baseName = fileName.replace(/\.[^.]+$/, ''); // 去掉扩展名

		for (let i = 0; i < lineCount; i++) {
			const line = editor.getLine(i);
			
			// 跳过不包含图片语法的行
			if (!line.includes('![[') && !line.includes('![')) continue;

			// 匹配 Wiki 链接: ![[image.png]] 或 ![[image.png|100]] 或 ![[folder/image.png]]
			const wikiRegex = /!\[\[([^\]|]+)(?:\|[^\]]+?)?\]\]/g;
			let match;
			while ((match = wikiRegex.exec(line)) !== null) {
				const fullMatch = match[0];
				const linkPath = match[1].trim();
				const linkFileName = linkPath.split('/').pop()?.toLowerCase() || '';
				const linkBaseName = linkFileName.replace(/\.[^.]+$/, '');

				// 精确文件名匹配或路径匹配
				if (linkFileName === fileName || 
					linkBaseName === baseName ||
					linkPath.toLowerCase() === imagePath.toLowerCase()) {
					matches.push({ lineNumber: i, line, fullMatch });
				}
			}

			// 匹配 Markdown 链接: ![alt](image.png) 或 ![](image.png)
			const mdRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
			while ((match = mdRegex.exec(line)) !== null) {
				const fullMatch = match[0];
				const linkPath = decodeURIComponent(match[2].trim());
				const linkFileName = linkPath.split('/').pop()?.toLowerCase() || '';
				const linkBaseName = linkFileName.replace(/\.[^.]+$/, '');

				// 精确文件名匹配或路径匹配
				if (linkFileName === fileName || 
					linkBaseName === baseName ||
					linkPath.toLowerCase() === imagePath.toLowerCase()) {
					matches.push({ lineNumber: i, line, fullMatch });
				}
			}
		}

		return matches;
	}

	private removeImageLink(editor: Editor, match: ImageMatch): void {
		const line = editor.getLine(match.lineNumber);
		const before = line.substring(0, line.indexOf(match.fullMatch));
		const after = line.substring(line.indexOf(match.fullMatch) + match.fullMatch.length);

		if (line.trim() === match.fullMatch.trim()) {
			// 整行只有图片，删除整行
			editor.replaceRange("", 
				{ line: match.lineNumber, ch: 0 },
				{ line: match.lineNumber + 1, ch: 0 }
			);
		} else {
			// 只删除图片链接部分
			const newLine = before + after;
			editor.setLine(match.lineNumber, newLine);
		}
	}

	onunload(): void {
		super.onunload();
		if (this.currentMenu) {
			this.currentMenu.hide();
			this.currentMenu = null;
		}
		this.contextMenuRegistered = false;
	}
}
