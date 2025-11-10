# Demo KTPM
```
1..6 | % { (Invoke-WebRequest http://localhost:3000/demo/sliding -UseBasicParsing).StatusCode }
1..12 | % { (Invoke-WebRequest http://localhost:3000/demo/bucket -UseBasicParsing).StatusCode }
```

# Test scenario 1

```
docker-compose -f docker-compose.scenario1.yml up --build -d
k6 run k6_script.js
docker-compose -f docker-compose.scenario1.yml down
```

# Test scenario 2

```
docker-compose -f docker-compose.scenario22.yml up --build -d
k6 run k6_script.js
docker-compose -f docker-compose.scenario2.yml down
```