function removeDiacritics(input: string): string {
  return input.normalize('NFD').replace(/\p{M}+/gu, '');
}

function removeNonAlphanum(str: string): string {
  return str.replace(/\W/g, '');
}

function makeSearchableString(str: string): string {
  return removeDiacritics(str).toLowerCase();
}

export { removeDiacritics, removeNonAlphanum, makeSearchableString };
