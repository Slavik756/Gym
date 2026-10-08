# Визуальные материалы

Главная использует две фотографии-иллюстрации для вымышленного клуба. Они созданы встроенным инструментом `imagegen`, не показывают реальный PowerGym и не являются фотографиями сотрудников. В рабочих файлах сайта они сохранены в JPEG с качеством 85, без изменения композиции:

- [athlete-hero.jpg](../public/images/athlete-hero.jpg) — главный экран; 226 КБ.
- [club-interior.jpg](../public/images/club-interior.jpg) — раздел о клубе; 269 КБ.

Логотип и направления тренировок представлены локальными SVG: [logo-mark.svg](../public/icons/logo-mark.svg) и [training.svg](../public/icons/training.svg). Они масштабируются без потери резкости и не требуют стороннего сервиса иконок. Плюс в подсказке расписания нарисован CSS из двух линий, чтобы не зависеть от метрик шрифта.

В карточках тренеров и отзывов используются инициалы вместо случайных мультяшных портретов. Имена, опыт и отзывы — примерное содержимое концепта. Для настоящего клуба замените их реальными сведениями; фотографию тренера можно поставить внутрь `.trainer-image`, убрав класс `trainer-monogram` и его декоративное содержимое.

## Использованные запросы

### Спортсмен

```text
Use case: photorealistic-natural
Asset type: hero photo for a premium fitness-club portfolio website.
Primary request: A natural editorial photograph of an adult male athlete resting between sets in a modern gym, wearing a plain charcoal training t-shirt, looking down with a quiet focused expression. Hands naturally lowered, not the focal point. Medium waist-up portrait, subject centered, generous breathing room around head and shoulders for a circular website crop.
Scene/backdrop: real gym with black rubber flooring and softly defocused strength equipment, no other people.
Lighting/mood: restrained soft side light, detailed skin texture and woven fabric, warm neutral shadows, not glossy or hyper-retouched. Clean documentary sports photography, subtle grain.
Composition: square image, no text space necessary, face and upper body clearly visible and recognizable in a 500-pixel circle.
Constraints: no text, no logos, no watermarks, no bodybuilder exaggeration, no cartoon, no CGI, no neon glowing lights.
```

### Интерьер

```text
Use case: photorealistic-natural
Asset type: about-the-club section photo for a premium fitness-club portfolio website.
Primary request: A thoughtfully composed natural photograph inside a contemporary neighborhood gym: dumbbell rack in the foreground, two training benches and a squat rack in the background. Calm spacious layout with convincing equipment geometry and everyday material details.
Style/medium: realistic architectural editorial photography, natural daylight from tall side windows, charcoal rubber floor, warm neutral walls, restrained olive details; gentle shadows, subtle film grain.
Composition/framing: landscape 3:2 crop, clear foreground and depth, no people.
Constraints: no text, no brands, no logos, no watermarks, no mirrored impossible equipment, no cartoon, no CGI, no dramatic neon lighting.
```
