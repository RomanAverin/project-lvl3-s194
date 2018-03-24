install: install-deps install-flow-typed

run:
	npm run babel-node -- 'src/bin/page-loader.js'

test-run:
	npm run babel-node -- 'src/bin/page-loader.js' https://ru.hexlet.io/courses/

install-deps:
	npm install

test-covarage:
	npm test -- --coverage

build:
	rm -rf dist
	npm run build

test:
	npm test

watch:
	npm run test -- --watch

debug:
	DEBUG=page-loader:* npm test

lint:
	npm run eslint .

publish:
	npm publish

.PHONY: test
