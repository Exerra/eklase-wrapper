export type TYear         = `${number}${number}${number}${number}`
export type TMonth        = `${number}${number}`
export type TDay          = `${number}${number}`
export type THours        = `${number}${number}`
export type TMinutes      = `${number}${number}`
export type TSeconds      = `${number}${number}`
export type TMilliseconds = `${number}${number}${number}`

export type TDateISODate = `${TYear}-${TMonth}-${TDay}`;

export type TDateISOTime = `${THours}:${TMinutes}:${TSeconds}.${TMilliseconds}`;

export type TDateISO = `${TDateISODate}T${TDateISOTime}Z`;