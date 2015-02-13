# Translations

### Preface / Summery

If you are comfortable with the command line and have git installed 
then,  
  - Make sure you have 
  [it set up](https://help.github.com/articles/set-up-git/) with $ git config --list
  - [Remember how to use git](http://rogerdudler.github.io/git-guide/)
  - We will be working on the main branch.
  - Fork.
  - Translate.
  - Push.
  - [pull request](https://help.github.com/articles/using-pull-requests/#before-you-begin).

If you are not comfortable with all that and would like some pretty interfaces 
then,  
  - Get a [git client](http://git-scm.com/download/gui/linux) that you are comfortable with.  
  - Fork the upstream repository.
  - Translate.
  - Commit changes.
  - Push to your fork.
  - Make a pull request to upstream.

For this walkthrough [github-for-windows](https://windows.github.com/)
/
[github-for-mac](https://mac.github.com/) will be used.  
(They are close enough to have one guide cover both at the same time)

### Getting started

#### From the browser

  - Login to your github account.
  - Click the "Fork" button on [this repository page](https://github.com/rmcauley/rainwave).

#### From the github client

  - Clone from your forked repository to your local computer for changes.
    - Press the plus sign in the upper left hand corner then, click "Clone" and
      select "rainwave"
  - Select a directory that you would like the new "rainwave" folder to appear.
    - I have a directory named "source" in my User directory that I dump all my
      source code in so, I will be using that one.
  - Enter the "lang" directory. This is where all of the translations reside.  

### Adding a new translation

  - Navigate with your file browser to the location you just chose and enter 
    the "rainwave" directory.
  - The file to be translated is /lang/en_MASTER.json
    - you may take a glimpse of the other files in this directory to see how
      the translations are placed.
  - Save the translation in /lang with ".json" as the file extension
    - currently the filenames in this directory are in the form:
      - xx_XX.json replace 'x' and 'X' with the lower and uppercase 2 ascii 
        character
        [language code](http://en.wikipedia.org/wiki/List_of_ISO_639-1_codes).
    - This is for readability purposes only.

### Getting your translation upstream

[This repository is upstream](https://github.com/rmcauley/rainwave) 

Note: If your copy of the repository has become out of date, the _easiest_ thing to do would 
be 
  - backup the translation that has been done so far
  - Delete the old fork from your github
  - Fork upstream again 
  - Clone your fork locally again
  - paste the translation back where it was

> Note from the author:  
> The git sanctioned way to remedy this is to do a rebase but, I would not expect
> the uninitiated to partake in such wizardry and I find it to be an un-necessary
> complication to something that should be simple enough for every day people to 
> do.  
> \*ahem\*

If the directions have been followed thus far there should be a new heading 
in the github client called "Uncommited changes" if not then the github client
is not detecting that files have changed in the repository directory you have 
selected and you should seek help in upstream's IRC, 
 If you are patient someone may help you on your way.

  - Click the "Show" button next to the "Uncommited changes" heading.
  - Add a summary. 
    - If the edit needs more than a 4 words to describe the changes,
    put something short in the summery line then, be as descriptive as needed in the
    description box.
  - Press "Commit to master".
  - In the upper right hand corner press "Sync".

If none of this makes any since and pictures are in order [this](https://help.github.com/articles/making-changes/) guide should point you in the right direction.

### Make the request

  - Make a 
  [pull request](https://help.github.com/articles/using-pull-requests/#before-you-begin)
  from the git hub web interface.

# Questions?

- [Message rmcauley on Github](https://github.com/rmcauley)
- #rainwave at synirc.net ([webclient here](http://widget.mibbit.com/?settings=6c1d29e713c9f8c150d99cd58b4b086b&server=irc.synirc.net&channel=%23rainwave&noServerNotices=true&noServerMotd=true&autoConnect=true))

The IRC channel will be VERY useful for when you'll have trouble figuring out
which messages are used where on the website.  If you don't understand a message,
please message rmcauley or submit an issue on Github so that a comment can be added
to help future translators.