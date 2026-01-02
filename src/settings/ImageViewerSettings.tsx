/**
 * 图片查看器设置组件
 */

import { usePluginSettings } from "@src/hook/usePluginSettings";
import { SettingSwitch, SettingTitle, SettingDescription } from "./Settings";
import { DEFAULT_IMAGE_VIEWER_SETTINGS } from "@src/types/types";

export function ImageViewerSettings() {
	const { pluginSettings, updatePluginSettings } = usePluginSettings();
	const imageViewer = pluginSettings.imageViewer || DEFAULT_IMAGE_VIEWER_SETTINGS;

	const updateImageViewerSettings = (updates: Partial<typeof imageViewer>) => {
		updatePluginSettings({
			...pluginSettings,
			imageViewer: {
				...imageViewer,
				...updates,
			},
		});
	};

	return (
		<>
			<SettingTitle>图片查看器</SettingTitle>
			<SettingDescription>
				按住 Ctrl 键点击图片可在全屏查看器中预览，支持滚轮缩放和拖拽移动
			</SettingDescription>

			<SettingSwitch
				label="在编辑器中查看图片"
				description="是否在 Markdown 编辑器和图片视图中启用图片查看器"
				checked={imageViewer.viewImageInEditor}
				onChange={(checked) =>
					updateImageViewerSettings({ viewImageInEditor: checked })
				}
			/>

			<SettingSwitch
				label="在社区插件浏览器中查看图片"
				description="是否在社区插件详情页面中启用图片查看器"
				checked={imageViewer.viewImageInCPB}
				onChange={(checked) =>
					updateImageViewerSettings({ viewImageInCPB: checked })
				}
			/>

			<SettingSwitch
				label="查看带链接的图片"
				description="是否对包含在链接中的图片启用查看器"
				checked={imageViewer.viewImageWithLink}
				onChange={(checked) =>
					updateImageViewerSettings({ viewImageWithLink: checked })
				}
			/>

			<SettingSwitch
				label="在其他位置查看图片"
				description="是否在模态框等其他位置启用图片查看器"
				checked={imageViewer.viewImageOther}
				onChange={(checked) =>
					updateImageViewerSettings({ viewImageOther: checked })
				}
			/>
		</>
	);
}
