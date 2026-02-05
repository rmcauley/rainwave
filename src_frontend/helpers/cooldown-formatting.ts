import { translation } from '../language/translations';

import { getServerTime } from './clock';

const timeFormatWeek = translation.timeformat_w as string;
const timeFormatDay = translation.timeformat_d as string;
const timeFormatHour = translation.timeformat_h as string;
const timeFormatMinute = translation.timeformat_m as string;
const timeFormatSeconds = translation.timeformat_s as string;

function cooldown(seconds: number): string {
  if (seconds < 60) {
    return '';
  }
  let humantime = '';
  let detail = 0;
  if (seconds >= 604800) {
    humantime += Math.floor(seconds / 604800) + timeFormatWeek + ' ';
    seconds = seconds % 604800;
    detail++;
  }
  if (seconds >= 86400) {
    humantime += Math.floor(seconds / 86400) + timeFormatDay + ' ';
    seconds = seconds % 86400;
    detail++;
  }
  if (seconds >= 3600) {
    humantime += Math.floor(seconds / 3600) + timeFormatHour + ' ';
    seconds = seconds % 3600;
    detail++;
  }
  if (seconds >= 60 && detail < 3) {
    humantime += Math.floor(seconds / 60) + timeFormatMinute + ' ';
    seconds = seconds % 60;
  }

  return humantime.substr(0, humantime.length - 1).trim();
}

function cooldownGlance(seconds: number): string {
  seconds -= getServerTime();
  if (seconds < 60) {
    return '';
  }
  if (seconds >= 604800) {
    return Math.floor(seconds / 604800) + timeFormatWeek;
  }
  if (seconds >= 86400) {
    return Math.floor(seconds / 86400) + timeFormatDay;
  }
  if (seconds >= 3600) {
    return Math.floor(seconds / 3600) + timeFormatHour;
  }
  if (seconds >= 60) {
    return Math.floor(seconds / 60) + timeFormatMinute;
  }

  return seconds + timeFormatSeconds;
}

export { cooldown, cooldownGlance };
