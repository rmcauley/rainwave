from typing import Union, Literal
from pydantic import BaseModel, RootModel

# Cross reference with src_frontend/language/translations.ts

LDMLPluralRule = Literal["zero", "one", "two", "few", "many", "other"]


class RainwaveTranslationSubstitution(BaseModel):
    type: Literal["substitute"]
    key: str


class RainwaveTranslationOrdinal(BaseModel):
    type: Literal["ordinal"]
    key: str


class RainwaveTranslationPlural(BaseModel):
    type: Literal["plural"]
    key: str
    plurals: dict[LDMLPluralRule, str]


RainwaveTranslationToken = Union[
    RainwaveTranslationSubstitution,
    RainwaveTranslationOrdinal,
    RainwaveTranslationPlural,
]

RainwaveTranslationValue = Union[str, list[Union[str, RainwaveTranslationToken]]]

RainwaveTranslationFile = dict[str, RainwaveTranslationValue]


class RainwaveTranslationFileModel(RootModel[RainwaveTranslationFile]):
    root: RainwaveTranslationFile
