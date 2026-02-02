/**
 * 引用检查服务
 */

import { App, TFile } from "obsidian";
import { ImageItem, ReferenceInfo } from "../types/image-manager.types";
import { ReferenceCache } from "../models/ReferenceCache";

export class ReferenceCheckService {
	private referenceCache: ReferenceCache;

	constructor(private app: App) {
		this.referenceCache = new ReferenceCache();
	}

	/**
	 * 检查图片引用
	 * @param images 要检查的图片列表
	 * @param onProgress 进度回调 (current, total)
	 */
	async checkReferences(
		images: ImageItem[],
		onProgress?: (current: number, total: number) => void
	): Promise<ImageItem[]> {
		if (images.length === 0) return images;

		try {
			const updatedImages = [...images];
			const batchSize = 20; // 每批处理20张图片
			let processedCount = 0;

			// 分批处理所有图片的引用检查
			for (let i = 0; i < updatedImages.length; i += batchSize) {
				const batch = updatedImages.slice(i, Math.min(i + batchSize, updatedImages.length));
				
				// 处理当前批次
				for (let j = 0; j < batch.length; j++) {
					const imageItem = batch[j];
					const actualIndex = i + j;
					const cacheKey = imageItem.path;

					// 检查缓存
					if (this.referenceCache.has(cacheKey)) {
						const cachedResult = this.referenceCache.get(cacheKey)!;
						updatedImages[actualIndex] = {
							...imageItem,
							references: cachedResult.references,
							referenceCount: cachedResult.referenceCount,
						};
						continue;
					}

					// 使用新的反向链接API查找引用
					const references = this.findReferencesUsingBacklinks(imageItem);

					const result = {
						references: references,
						referenceCount: references.length,
					};

					// 缓存结果
					this.referenceCache.set(cacheKey, result);

					updatedImages[actualIndex] = {
						...imageItem,
						...result,
					};
				}
				
				processedCount += batch.length;
				
				// 调用进度回调
				if (onProgress) {
					onProgress(processedCount, updatedImages.length);
				}
				
				// 给 UI 线程一些时间更新，避免阻塞
				await new Promise(resolve => setTimeout(resolve, 0));
			}

			return updatedImages;
		} catch (error) {
			console.error("检查引用时出错:", error);
			throw error;
		}
	}

	/**
	 * 使用 Obsidian 反向链接 API 查找引用
	 */
	private findReferencesUsingBacklinks(
		imageItem: ImageItem
	): ReferenceInfo[] {
		const references: ReferenceInfo[] = [];

		// 对于自定义文件类型，使用对应的封面文件来检查引用
		let targetFile = imageItem.originalFile;
		if (imageItem.isCustomType && imageItem.displayFile !== imageItem.originalFile) {
			// 对于自定义文件类型，使用displayFile（封面文件）来检查引用
			targetFile = imageItem.displayFile;
		}

		// 使用 Obsidian 的反向链接 API
		const metadataCache = this.app.metadataCache as {
			getBacklinksForFile?: (file: TFile) => { data?: Map<string, unknown> } | undefined;
		};
		const backlinks = metadataCache.getBacklinksForFile?.(targetFile);
		
		if (!backlinks || !backlinks.data) {
			return references;
		}

		// 遍历所有反向链接
		for (const [sourcePath, linkOccurrences] of backlinks.data) {
			const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
			
			if (!(sourceFile instanceof TFile)) {
				continue;
			}

			// 检查每个引用位置
			if (Array.isArray(linkOccurrences)) {
				for (const occurrence of linkOccurrences) {
					// 判断是嵌入还是链接
					const isEmbed = occurrence.link?.startsWith("!");
					
					references.push({
						file: sourceFile,
						type: isEmbed ? "embed" : "link",
						position: occurrence.position,
					});
				}
			}
		}

		return references;
	}

	/**
	 * 清除缓存
	 */
	clearCache(): void {
		this.referenceCache.clear();
	}

	/**
	 * 获取缓存
	 */
	getCache(): ReferenceCache {
		return this.referenceCache;
	}
}
