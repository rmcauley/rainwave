import type { TimelineSong } from '../rainwaveApi/types';

type Notifier = (song: TimelineSong, artists: string, art: string) => Notification;

export type { Notifier };
