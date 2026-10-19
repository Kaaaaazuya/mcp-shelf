/** リクエスト URL からサイトの origin（末尾スラッシュなし）を返す。SITE_URL 定数の代わり */
export function siteUrlFrom(requestUrl: string): string {
  return new URL(requestUrl).origin;
}
