run:
	node 'src/bin/page-loader.js'

test-run:
	node 'src/bin/page-loader.js' https://ru.hexlet.io/courses

install:
	npm install

test-coverage:
	npm test -- --coverage

build:
	rm -rf dist
	npm run build

test:
	npm test

watch:
	npm run test -- --watch

test-debug:
	DEBUG=page-loader:* npm run test -- --watch

debug:
	DEBUG=page-loader:* npm test

lint:
	npm run eslint .

link:
	nrm -rf dist
	npm run build
	npm link

.PHONY: test
