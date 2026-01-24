/**
 * This API event occurs when a user who is logged in tunes in without using their listener key.
 * This prompts them to tune in again in order to obtain the correct M3U.
 */
export interface RedownloadM3u {
  tl_key: 'redownload_m3u';
  text: string;
}
