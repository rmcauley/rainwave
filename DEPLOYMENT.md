# Production deployment notes

After committing changes to the repo, follow this process to deploy to production:

```
# open a shell as `rainwave`
sudo -u rainwave -i

# navigate to /home/rainwave/rainwave
cd /home/rainwave/rainwave

# pull changes from github
git pull

# close the shell
exit

# open a shell as `root`
sudo -i

# navigate to /home/rainwave/rainwave
cd /home/rainwave/rainwave

# run the installation script
uv run install.py

# close the shell
exit
```
