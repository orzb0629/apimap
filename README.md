# 사이 — 거리 측정 웹앱

Nominatim에서 실제 장소를 검색·선택하고, 자동차 도로거리(OSRM) 또는 직선거리(Haversine)를 계산하는 한국어 반응형 웹앱입니다. 총거리 아래 **지도에서 보기** 링크로 OpenStreetMap을 엽니다. 자동차 모드는 경로 화면, 직선거리 모드는 두 좌표를 포함하는 지도 영역을 엽니다.

## 실행

Node.js 22 이상만 필요합니다. 설치할 패키지, Redis, 데이터베이스, API 키, 환경변수가 없습니다.

```sh
npm run dev
```

http://localhost:3000 에 접속합니다. HTML 파일을 직접 더블클릭하지 마세요. 정적 HTTP 서버가 필요합니다.

```sh
npm test
npm run build
```

빌드 결과는 `dist/`입니다. 외부 폰트가 로드되지 않아도 시스템 글꼴로 동작합니다.

## GitHub → Vercel

1. 이 폴더의 파일을 자신의 GitHub 저장소에 업로드합니다. `dist/`, `.env`, `node_modules/`는 올리지 않습니다.
2. Vercel에서 **Add New → Project**로 저장소를 Import합니다.
3. Framework Preset은 **Other**, Root Directory는 이 프로젝트 루트로 선택합니다.
4. `vercel.json`에 Build Command `npm run build`, Output Directory `dist`가 지정되어 있습니다. Install Command를 요구하면 `npm install`을 사용해도 됩니다. 의존성은 없습니다.
5. 환경변수를 추가하지 않고 **Deploy**합니다.

이 작업에서는 GitHub 업로드와 실제 Vercel 배포를 수행하지 않았습니다.

## 사용 방법

출발지와 도착지를 각각 입력하고 **검색**을 누른 뒤, 검색된 목록에서 장소를 선택합니다. 선택한 장소의 전체 주소를 확인하세요. 두 곳을 선택하면 거리 계산 버튼이 활성화됩니다. 장소 입력 또는 계산 기준을 바꾸면 기존 결과가 초기화됩니다. 자동차 경로를 찾지 못하면 오류를 표시하며, 직선거리로 변경해 직접 계산할 수 있습니다.

Nominatim에 등록되지 않은 명칭은 조회되지 않을 수 있습니다. 상세 주소나 지역명을 함께 입력하세요. 도로거리는 자동차 추천 경로의 거리이며 최단거리, 실시간 교통정보, 도보거리를 의미하지 않습니다. 직선거리는 지구를 구로 근사한 두 좌표 사이의 거리입니다. 지도 그림은 설명용 일러스트이며 실제 경로가 아닙니다.

## 공용 API 이용 조건과 운영 범위

**소규모 개인용·시연용 앱입니다. 공용 Nominatim은 앱 전체 합산 초당 최대 1회 요청 제한이 있습니다.** [공식 이용 정책](https://operations.osmfoundation.org/policies/nominatim/)을 확인하고 운영자가 준수해야 합니다. 자동완성, 대량 수집, 반복적인 자동 조회를 하지 마세요. 민감한 개인정보를 검색어로 입력하지 마세요.

- 검색 버튼이나 Enter로 명시적으로 실행한 검색만 요청합니다. 입력 중에는 호출하지 않습니다.
- 검색과 경로 결과를 브라우저 localStorage에 24시간 캐시합니다. 브라우저 저장이 불가능하면 메모리에 캐시합니다.
- 검색은 1.1초 간격으로 제한하고, Web Locks 지원 브라우저에서는 동일 출처 탭들의 요청을 직렬화합니다.
- **이는 서로 다른 사용자·브라우저를 합산한 제한을 보장하지 않습니다.** Redis 등 공유 상태가 없는 정적 앱의 한계입니다. 이용자가 늘어나면 공용 API를 계속 사용하지 말고 요청 제한을 중앙에서 보장하는 프록시나 별도 제공 서비스로 전환해야 합니다.
- HTTPS 배포 시 브라우저가 실제 사이트 origin을 Referer로 전달합니다. 앱은 Referer를 제거하지 않습니다.
- 외부 서비스의 장애, 차단, 요청 제한, 검색 데이터 누락에 따라 검색·도로거리 계산이 실패할 수 있습니다. 공개 서비스의 가용성 보장은 없습니다.
- OSRM 공용 서버는 소규모 비상업적 시연 용도입니다. 상업 운영 또는 트래픽 증가 시 적절한 라우팅 서비스를 사용하세요. [OSRM 문서](https://project-osrm.org/docs/v26.5.0/http/) · [공용 서버 안내](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server)

API 주소는 클라이언트 코드에 고정하지 않고 `/config.json`에서 실행 시 읽습니다. `public/config.json`의 `nominatimUrl`, `routingUrl`을 수정하여 서비스 제공자를 전환할 수 있습니다. 교체 서비스는 동일한 응답 형식 및 CORS 지원이 필요합니다. 키를 요구하는 서비스를 쓰면 브라우저에 비밀 키를 넣지 말고 별도의 서버 구성을 사용해야 합니다.

검색어와 좌표는 해당 외부 서비스로 전송됩니다. 캐시는 사용자의 브라우저에만 저장되며 브라우저의 사이트 데이터 삭제 기능으로 제거할 수 있습니다. 앱 자체 서버에는 검색 기록을 저장하지 않습니다.

## 구성

- `public/index.html`, `style.css`: 접근성 레이블과 모바일 레이아웃을 포함한 화면
- `public/app.js`: 검색, 결과 선택, 캐시, 계산, 오류 처리
- `public/distance.js`: 거리 공식, 단위 표시, 지도 링크
- `public/config.json`: 공개 API 주소
- `scripts/`: 정적 빌드 및 로컬 서버
- `test/`: 거리 계산 및 지도 URL 검증

장소 데이터 © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL.
