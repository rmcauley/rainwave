locale_explanation = r"""
Rainwave localizations are stored in a JSON file and use the following syntax:

"translation_key":  "Translated phrase."

There are some value replacements you can use in the translated phrase strings:

%(stuff)
    - will display the variable inside ()
        = "event_on_station": "Event on %(station_name) "
            --> "Event on Game"
        = "rating:"     : "Rating: %(num_ratings)"
            --> "Rating: 5.0"

#(stuff)
    - Will display a number with a suffix at the end.
    - Suffixes are not provided in the master language file.
    - English examples:
         = "rank"    : "Rank: #(rank)"
        = "suffix_1": "st"
            --> "Rank: 1st" when rank is 1
        = "suffix_2": "nd"
            --> "Rank: 2nd" when rank is 2
        = "suffix_3": "rd"
            --> "Rank: 3rd" when rank is 3
    - When looking up e.g. the number 1253, the system searches in this order:
        1. "suffix_1253"
        2. "suffix_253"
        3. "suffix_53"
        4. "suffix_3"
    - Be mindful of this.  Example, 13 in English:
        = "suffix_3": "rd"
            --> "Rank: 3rd"
            --> "Rank: 13rd"
            --> "Rank: 113rd"
        = "suffix_13": "th"
            --> "Rank: 3"
            --> "Rank: 13th"
            --> "Rank: 113th"
        = "suffix_3": "rd", "suffix_13": "th"
            --> "Rank: 3rd"
            --> "Rank: 13th"
            --> "Rank: 113th"

&(stuff:person is/people are)
    - Uses the first part (split by the /) if "stuff" is 1, uses the latter half if stuff is != 1 (sorry, plurals are restricted to English grammar)
        = "favorited_by": "Favourited by &(fave_count:person/people)"
            --> "Favourited by 0 people"
            --> "Favourited by 1 person"
            --> "Favourited by 2 people"
            --> "Favourited by 3 people" etc

The JSON files should be encoded in UTF-8.
"""
