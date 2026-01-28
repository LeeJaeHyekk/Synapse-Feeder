# Zero-Shot Classification 설정 가이드

## 개요

Zero-Shot Classification은 학습하지 않은 카테고리도 분류할 수 있는 ML 기반 분류 시스템입니다. Python API 서버를 구축하여 Node.js에서 호출할 수 있습니다.

---

## 1. Python API 서버 구축 (선택적)

### 1.1 필요한 패키지 설치

```bash
pip install fastapi uvicorn transformers torch
```

### 1.2 FastAPI 서버 코드 예시

`zero_shot_api.py` 파일 생성:

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline
from typing import List, Dict

app = FastAPI()

# Zero-Shot Classification 파이프라인 초기화
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

class ClassificationRequest(BaseModel):
    text: str
    categories: List[str]

class ClassificationResponse(BaseModel):
    label: str
    score: float

class ClassificationScoresResponse(BaseModel):
    scores: Dict[str, float]

@app.post("/classify", response_model=ClassificationResponse)
async def classify(request: ClassificationRequest):
    try:
        result = classifier(request.text, request.categories)
        return {
            "label": result["labels"][0],
            "score": result["scores"][0]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/classify-scores", response_model=ClassificationScoresResponse)
async def classify_scores(request: ClassificationRequest):
    try:
        result = classifier(request.text, request.categories)
        scores = dict(zip(result["labels"], result["scores"]))
        return {"scores": scores}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 1.3 서버 실행

```bash
python zero_shot_api.py
```

또는 uvicorn 직접 사용:

```bash
uvicorn zero_shot_api:app --host 0.0.0.0 --port 8000
```

---

## 2. Node.js에서 사용

### 2.1 환경 변수 설정

`.env` 파일에 추가:

```env
# Zero-Shot Classification API URL (비활성화하려면 'disabled' 설정)
ZERO_SHOT_API_URL=http://localhost:8000
```

### 2.2 코드에서 사용

```typescript
import { classifyWithZeroShot } from './collectors/utils/htmlParser.js'

// 단일 텍스트 분류
const result = await classifyWithZeroShot(
  '한국상장회사협의회에서 공지사항을 발표했습니다.',
  {
    categories: ['공지사항', '세미나', '행사', '뉴스'],
  }
)

if (result) {
  console.log(`분류: ${result.label}, 신뢰도: ${result.score}`)
}
```

---

## 3. 통합 예시

### 3.1 Dynamic Collector에 통합

`DynamicCollector`에서 수집된 데이터를 자동으로 분류:

```typescript
import { classifyWithZeroShot } from '../utils/htmlParser.js'

// 수집 후 분류
const classification = await classifyWithZeroShot(item.content, {
  categories: ['공지사항', '세미나', '행사', '뉴스'],
})

if (classification) {
  item.category = classification.label
  item.classificationConfidence = classification.score
}
```

---

## 4. 성능 최적화

### 4.1 배치 처리

여러 텍스트를 한 번에 분류:

```typescript
import { classifyBatch } from './collectors/utils/htmlParser.js'

const texts = ['텍스트1', '텍스트2', '텍스트3']
const results = await classifyBatch(texts, {
  categories: ['공지사항', '세미나', '행사'],
})
```

### 4.2 캐싱

동일한 텍스트에 대한 중복 분류 방지:

```typescript
import { getCache, setCache } from '../../utils/index.js'

async function classifyWithCache(text: string, categories: string[]) {
  const cacheKey = `zero-shot:${text}:${categories.join(',')}`
  const cached = getCache(cacheKey)
  
  if (cached) {
    return cached
  }
  
  const result = await classifyWithZeroShot(text, { categories })
  if (result) {
    setCache(cacheKey, result, 3600) // 1시간 캐시
  }
  
  return result
}
```

---

## 5. 모델 선택

### 5.1 기본 모델: `facebook/bart-large-mnli`
- **장점**: 빠르고 정확도 높음
- **단점**: 영어에 특화 (한국어는 다소 낮은 정확도)

### 5.2 한국어 모델: `MoritzLaurer/mDeBERTa-v3-base-mnli-xnli`
- **장점**: 다국어 지원, 한국어 성능 우수
- **단점**: 모델 크기가 큼

### 5.3 모델 변경 방법

`zero_shot_api.py`에서 모델 변경:

```python
# 한국어 모델 사용
classifier = pipeline(
    "zero-shot-classification",
    model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli"
)
```

---

## 6. 트러블슈팅

### 6.1 API 서버 연결 실패
- 서버가 실행 중인지 확인: `curl http://localhost:8000/health`
- 방화벽 설정 확인
- 환경 변수 `ZERO_SHOT_API_URL` 확인

### 6.2 분류 정확도 낮음
- 더 구체적인 카테고리 사용
- 텍스트 전처리 (불필요한 문자 제거)
- 다른 모델 시도

### 6.3 성능 이슈
- 배치 처리 사용
- 캐싱 활성화
- GPU 사용 (가능한 경우)

---

## 7. 비활성화

Zero-Shot Classification을 사용하지 않으려면:

```env
ZERO_SHOT_API_URL=disabled
```

또는 환경 변수를 설정하지 않으면 자동으로 비활성화됩니다.

---

## 참고 자료

- [Hugging Face Zero-Shot Classification](https://huggingface.co/docs/transformers/tasks/zero_shot_classification)
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [Transformers 라이브러리](https://huggingface.co/docs/transformers)
