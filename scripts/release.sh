git flow release start $1
git flow release finish $1
git checkout gh-pages
git checkout master -- index.html src vendor image audio
git commit -m "update github pages"
git push
git checkout master
