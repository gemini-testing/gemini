if [ "$TRAVIS_PULL_REQUEST" == "false" ] && [ "$TRAVIS_BRANCH" == "master" ]; then
    echo -e "Starting to update gh-pages\n"

    git config --global user.email "travis@travis-ci.org"
    git config --global user.name "Travis"

    $(npm bin)/massage
    git clone -b gh-pages https://${GH_TOKEN}@github.com/gemini-testing/gemini.git deploy
    rsync -avz --stats site/ deploy/

    cd deploy
    git add -A
    git commit -m "Travis build $TRAVIS_BUILD_NUMBER pushed to gh-pages"
    git push origin gh-pages

    echo -e "Finishing to update gh-pages\n"
fi
