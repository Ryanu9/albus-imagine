import { Plugin, WorkspaceLeaf } from "obsidian";
import { PluginSettingTab } from "./settings/PluginSettingTab";
import SettingsStore from "./settings/SettingsStore";
import { IPluginSettings } from "./types/types";
import { ImageManagerView, IMAGE_MANAGER_VIEW_TYPE } from "./views/ImageManagerView";
import { ResizeHandler } from "./handlers";
import "./styles";

export default class AlbusFigureManagerPlugin extends Plugin {
	settings: IPluginSettings;
	readonly settingsStore = new SettingsStore(this);
	private resizeHandler: ResizeHandler | null = null;

	async onload() {
		await this.settingsStore.loadSettings();

		// 初始化图片调整大小处理器
		if (this.settings.imageResize?.dragResize) {
			this.initializeResizeHandler();
		}

		// 注册视图
		this.registerView(
			IMAGE_MANAGER_VIEW_TYPE,
			(leaf) => new ImageManagerView(leaf, this.settings.imageManager || {})
		);

		// 添加功能区图标 - 打开图片管理器
		const ribbonIconEl = this.addRibbonIcon(
			"images",
			"图片管理器",
			(evt: MouseEvent) => {
				this.openImageManager();
			}
		);
		ribbonIconEl.addClass("albus-figure-manager-ribbon-icon");

		// 添加命令 - 打开图片管理器
		this.addCommand({
			id: "open-image-manager",
			name: "打开图片管理器",
			callback: () => {
				this.openImageManager();
			},
		});

		// 添加设置选项卡
		this.addSettingTab(new PluginSettingTab(this));
	}

	/**
	 * 初始化图片调整大小处理器
	 */
	private initializeResizeHandler(): void {
		if (!this.settings.imageResize) return;

		this.resizeHandler = new ResizeHandler(this, this.settings.imageResize);
		
		// 注册主文档事件
		this.resizeHandler.registerDocument(document);

		// 监听新窗口打开事件
		this.registerEvent(
			this.app.workspace.on('window-open', (workspaceWindow, window) => {
				if (this.resizeHandler) {
					this.resizeHandler.registerDocument(window.document);
				}
			})
		);
	}

	/**
	 * 打开图片管理器
	 */
	async openImageManager(): Promise<void> {
		const { workspace } = this.app;

		// 检查是否已有打开的视图
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(IMAGE_MANAGER_VIEW_TYPE);

		if (leaves.length > 0) {
			// 如果已存在，激活它
			leaf = leaves[0];
			workspace.revealLeaf(leaf);
		} else {
			// 在中间窗口创建新的视图（而非侧边栏）
			leaf = workspace.getLeaf('tab');
			if (leaf) {
				await leaf.setViewState({
					type: IMAGE_MANAGER_VIEW_TYPE,
					active: true,
				});
				workspace.revealLeaf(leaf);
			}
		}
	}

	onunload() {
		// 清理工作
		this.app.workspace.detachLeavesOfType(IMAGE_MANAGER_VIEW_TYPE);
		this.resizeHandler = null;
	}

	async saveSettings() {
		await this.saveData(this.settings);
		
		// 更新调整大小处理器设置
		if (this.settings.imageResize) {
			if (this.settings.imageResize.dragResize && !this.resizeHandler) {
				// 如果启用了拖拽调整但处理器未初始化，则初始化
				this.initializeResizeHandler();
			} else if (this.resizeHandler) {
				// 更新现有处理器的设置
				this.resizeHandler.updateSettings(this.settings.imageResize);
			}
		}
		
		// 通知所有打开的图片管理器视图更新设置
		const leaves = this.app.workspace.getLeavesOfType(IMAGE_MANAGER_VIEW_TYPE);
		leaves.forEach(leaf => {
			const view = leaf.view;
			if (view instanceof ImageManagerView) {
				view.updateSettings(this.settings.imageManager || {});
			}
		});
	}
}
