function removeDiacritics(input: string): string {
  return input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function removeNonAlphanum(str: string): string {
  return str.replace(/\W/g, '');
}

function makeSearchableString(str: string): string {
  return removeDiacritics(str).toLowerCase().trim();
}

export { removeDiacritics, removeNonAlphanum, makeSearchableString };
