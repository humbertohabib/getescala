# GETESCALA - Source Code Blueprint

## 1. Visão Geral do Blueprint

Este documento define a estrutura completa do código-fonte do GETESCALA, incluindo organização de projetos, padrões de desenvolvimento, arquitetura técnica e diretrizes de implementação. O blueprint foi projetado para suportar desenvolvimento ágil, manutenibilidade e escalabilidade de equipe.

## 2. Estrutura de Projetos

### 2.1 Monorepo Structure
```
getescala/
├── apps/
│   ├── web/                    # Frontend React
│   ├── mobile/                 # React Native
│   ├── admin/                  # Admin Portal
│   └── api/                    # Backend API
├── packages/
│   ├── shared/                 # Código compartilhado
│   ├── ui/                     # Design System
│   ├── utils/                  # Utilitários
│   └── types/                  # TypeScript types
├── services/
│   ├── notification-service/   # Microserviço de notificações
│   ├── audit-service/          # Microserviço de auditoria
│   └── report-service/         # Microserviço de relatórios
├── infrastructure/
│   ├── terraform/              # IaC
│   ├── docker/                 # Configurações Docker
│   └── kubernetes/             # K8s manifests
├── tools/
│   ├── scripts/                # Scripts de automação
│   ├── migrations/             # Database migrations
│   └── seeders/                # Dados de teste
└── docs/                       # Documentação
```

### 2.2 Apps - Frontend Applications

#### 2.2.1 Web App (React + TypeScript)
```
apps/web/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.test.tsx
│   │   │   │   ├── Button.stories.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   └── LoadingSpinner/
│   │   ├── layout/
│   │   │   ├── Header/
│   │   │   ├── Sidebar/
│   │   │   ├── Footer/
│   │   │   └── Layout/
│   │   ├── schedule/
│   │   │   ├── ScheduleCalendar/
│   │   │   ├── ShiftCard/
│   │   │   ├── ShiftEditor/
│   │   │   ├── ConflictDetector/
│   │   │   └── EmployeeSelector/
│   │   ├── employee/
│   │   │   ├── EmployeeList/
│   │   │   ├── EmployeeForm/
│   │   │   ├── EmployeeProfile/
│   │   │   └── EmployeeImport/
│   │   ├── dashboard/
│   │   │   ├── DashboardGrid/
│   │   │   ├── KPIWidget/
│   │   │   ├── ChartWidget/
│   │   │   └── ActivityFeed/
│   │   └── reports/
│   │       ├── ReportBuilder/
│   │       ├── ReportViewer/
│   │       ├── ChartRenderer/
│   │       └── ExportOptions/
│   ├── pages/
│   │   ├── Login/
│   │   ├── Dashboard/
│   │   ├── ScheduleManagement/
│   │   ├── EmployeeManagement/
│   │   ├── Reports/
│   │   ├── Settings/
│   │   └── NotFound/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSchedule.ts
│   │   ├── useNotification.ts
│   │   ├── usePermission.ts
│   │   ├── useDebounce.ts
│   │   └── useLocalStorage.ts
│   ├── services/
│   │   ├── api/
│   │   │   ├── apiClient.ts
│   │   │   ├── auth.api.ts
│   │   │   ├── schedule.api.ts
│   │   │   ├── employee.api.ts
│   │   │   └── notification.api.ts
│   │   ├── websocket/
│   │   │   ├── websocket.ts
│   │   │   └── notificationSocket.ts
│   │   └── storage/
│   │       ├── localStorage.ts
│   │       └── sessionStorage.ts
│   ├── store/
│   │   ├── index.ts
│   │   ├── auth/
│   │   │   ├── authSlice.ts
│   │   │   └── authThunks.ts
│   │   ├── schedule/
│   │   │   ├── scheduleSlice.ts
│   │   │   └── scheduleThunks.ts
│   │   └── notification/
│   │       ├── notificationSlice.ts
│   │       └── notificationThunks.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   ├── dateHelpers.ts
│   │   └── errorHandlers.ts
│   ├── types/
│   │   ├── api.types.ts
│   │   ├── schedule.types.ts
│   │   ├── employee.types.ts
│   │   └── notification.types.ts
│   ├── styles/
│   │   ├── globals.css
│   │   ├── variables.css
│   │   └── theme.ts
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── api.config.ts
│   │   └── firebase.config.ts
│   ├── App.tsx
│   ├── index.tsx
│   └── setupTests.ts
├── tests/
│   ├── e2e/
│   │   ├── login.spec.ts
│   │   ├── schedule.spec.ts
│   │   └── employee.spec.ts
│   └── fixtures/
│       ├── users.json
│       ├── schedules.json
│       └── employees.json
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── package.json
└── README.md
```

#### 2.2.2 Mobile App (React Native)
```
apps/mobile/
├── android/                    # Android-specific code
├── ios/                        # iOS-specific code
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button/
│   │   │   ├── TextInput/
│   │   │   ├── Card/
│   │   │   └── LoadingIndicator/
│   │   ├── navigation/
│   │   │   ├── TabBar/
│   │   │   ├── Header/
│   │   │   └── Drawer/
│   │   ├── schedule/
│   │   │   ├── ScheduleCalendar/
│   │   │   ├── ShiftCard/
│   │   │   ├── ShiftDetails/
│   │   │   └── ShiftActions/
│   │   └── notification/
│   │       ├── NotificationList/
│   │       ├── NotificationItem/
│   │       └── PushNotificationHandler/
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── Dashboard/
│   │   │   ├── DashboardScreen.tsx
│   │   │   └── DashboardWidgets.tsx
│   │   ├── Schedule/
│   │   │   ├── ScheduleScreen.tsx
│   │   │   ├── ScheduleDetailScreen.tsx
│   │   │   └── ShiftSwapScreen.tsx
│   │   ├── Notifications/
│   │   │   └── NotificationsScreen.tsx
│   │   └── Profile/
│   │       └── ProfileScreen.tsx
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── TabNavigator.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── notification.service.ts
│   │   ├── offline.service.ts
│   │   └── location.service.ts
│   ├── store/
│   │   ├── auth/
│   │   ├── schedule/
│   │   └── notification/
│   ├── hooks/
│   │   ├── useAppState.ts
│   │   ├── usePushNotifications.ts
│   │   └── useLocation.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── permissions.ts
│   │   └── dateHelpers.ts
│   ├── types/
│   │   ├── navigation.types.ts
│   │   ├── schedule.types.ts
│   │   └── notification.types.ts
│   ├── config/
│   │   └── app.config.ts
│   └── App.tsx
├── __tests__/
├── index.js
├── metro.config.js
├── react-native.config.js
├── package.json
└── README.md
```

### 2.3 Backend API (Node.js + TypeScript)
```
apps/api/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.middleware.ts
│   │   │   ├── auth.validators.ts
│   │   │   ├── auth.types.ts
│   │   │   └── auth.routes.ts
│   │   ├── schedule/
│   │   │   ├── schedule.controller.ts
│   │   │   ├── schedule.service.ts
│   │   │   ├── schedule.repository.ts
│   │   │   ├── schedule.validators.ts
│   │   │   ├── schedule.types.ts
│   │   │   ├── schedule.routes.ts
│   │   │   ├── schedule.policies.ts
│   │   │   └── schedule.events.ts
│   │   ├── employee/
│   │   │   ├── employee.controller.ts
│   │   │   ├── employee.service.ts
│   │   │   ├── employee.repository.ts
│   │   │   └── employee.routes.ts
│   │   ├── notification/
│   │   │   ├── notification.controller.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── notification.providers.ts
│   │   │   └── notification.routes.ts
│   │   ├── audit/
│   │   │   ├── audit.controller.ts
│   │   │   ├── audit.service.ts
│   │   │   └── audit.repository.ts
│   │   └── billing/
│   │       ├── billing.controller.ts
│   │       ├── billing.service.ts
│   │       └── billing.providers.ts
│   ├── shared/
│   │   ├── database/
│   │   │   ├── connection.ts
│   │   │   ├── migrations/
│   │   │   └── models/
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── validators.ts
│   │   │   ├── errors.ts
│   │   │   └── helpers.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── rateLimiter.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validation.ts
│   │   ├── types/
│   │   │   ├── api.types.ts
│   │   │   ├── database.types.ts
│   │   │   └── common.types.ts
│   │   └── constants/
│   │       ├── index.ts
│   │       └── errors.ts
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── auth.config.ts
│   │   ├── email.config.ts
│   │   └── app.config.ts
│   ├── app.ts
│   ├── server.ts
│   └── routes.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .env.example
├── tsconfig.json
├── jest.config.js
├── package.json
└── README.md
```

## 3. Stack Tecnológico Detalhado

### 3.1 Frontend Stack
- **Framework:** React 18.2.0
- **Build Tool:** Vite 4.4.0
- **Type System:** TypeScript 5.0
- **State Management:** Redux Toolkit 1.9.5 + RTK Query
- **UI Library:** Material-UI 5.14.0
- **Forms:** React Hook Form 7.45.0 + Yup 1.2.0
- **Charts:** Recharts 2.7.0
- **Calendar:** FullCalendar 6.1.0
- **Testing:** Jest 29.6.0 + React Testing Library 13.4.0 + Cypress 12.17.0
- **Linting:** ESLint 8.44.0 + Prettier 3.0.0
- **Icons:** Material-UI Icons + React Icons
- **Date/Time:** date-fns 2.30.0 + moment 2.29.0

### 3.2 Mobile Stack
- **Framework:** React Native 0.72.0
- **Navigation:** React Navigation 6.14.0
- **State:** Redux Toolkit 1.9.5 + RTK Query
- **UI:** React Native Elements 3.4.0 + Native Base 3.4.0
- **Push Notifications:** React Native Firebase 18.1.0
- **Offline:** Redux Persist 6.0.0 + NetInfo 9.4.0
- **Geolocation:** React Native Geolocation 2.1.0
- **Calendar:** React Native Calendar 1.1300.0
- **Testing:** Jest 29.6.0 + Detox 20.9.0

### 3.3 Backend Stack
- **Runtime:** Node.js 18.16.0 LTS
- **Framework:** Express.js 4.18.0 + TypeScript 5.0
- **Database:** PostgreSQL 15.3 + Prisma 5.0.0
- **Cache:** Redis 7.0.0 + ioredis 5.3.0
- **Auth:** JWT + bcrypt 5.1.0 + passport 0.6.0
- **Validation:** Joi 17.9.0 + express-validator 7.0.0
- **Email:** Nodemailer 6.9.0 + SendGrid
- **File Upload:** Multer 1.4.0 + AWS S3
- **Rate Limiting:** express-rate-limit 6.8.0
- **Compression:** compression 1.7.0
- **Helmet:** helmet 7.0.0 (security)
- **CORS:** cors 2.8.0
- **Testing:** Jest 29.6.0 + Supertest 6.3.0

### 3.4 Infrastructure Stack
- **Cloud:** AWS (EC2, RDS, S3, CloudFront, ECS)
- **Container:** Docker 24.0.0 + Docker Compose 2.19.0
- **Orchestration:** Kubernetes 1.27.0 (EKS)
- **CI/CD:** GitHub Actions + ArgoCD
- **Monitoring:** CloudWatch + Grafana + Prometheus
- **Logging:** CloudWatch Logs + ELK Stack
- **IaC:** Terraform 1.5.0
- **CDN:** CloudFront
- **DNS:** Route 53

## 4. Padrões de Arquitetura

### 4.1 Domain-Driven Design (DDD)
```typescript
// Domain Model Example
export class Schedule extends AggregateRoot {
  private _id: string;
  private _departmentId: string;
  private _monthReference: Date;
  private _status: ScheduleStatus;
  private _shifts: Shift[];
  private _metadata: Record<string, any>;

  constructor(id: string, departmentId: string, monthReference: Date) {
    super();
    this._id = id;
    this._departmentId = departmentId;
    this._monthReference = monthReference;
    this._status = ScheduleStatus.DRAFT;
    this._shifts = [];
    this._metadata = {};
  }

  // Business Logic
  addShift(shift: Shift): void {
    this.validateShiftConflict(shift);
    this._shifts.push(shift);
    this.addDomainEvent(new ShiftAddedEvent(this._id, shift.id));
  }

  publish(): void {
    if (this._shifts.length === 0) {
      throw new ScheduleCannotBePublishedError('Schedule must have at least one shift');
    }
    this._status = ScheduleStatus.PUBLISHED;
    this.addDomainEvent(new SchedulePublishedEvent(this._id));
  }

  private validateShiftConflict(shift: Shift): void {
    const conflictingShift = this._shifts.find(s => 
      s.employeeId === shift.employeeId && 
      this.isTimeOverlapping(s, shift)
    );
    
    if (conflictingShift) {
      throw new ShiftConflictError('Employee already has a shift at this time');
    }
  }
}
```

### 4.2 Clean Architecture Layers
```
src/
├── domain/                     # Enterprise business rules
│   ├── entities/
│   ├── value-objects/
│   ├── repositories/
│   └── services/
├── application/               # Application business rules
│   ├── use-cases/
│   ├── dto/
│   └── mappers/
├── infrastructure/              # External concerns
│   ├── database/
│   ├── http/
│   ├── messaging/
│   └── external-services/
└── presentation/                # Interface adapters
    ├── controllers/
    ├── middleware/
    └── routes/
```

### 4.3 Repository Pattern
```typescript
// Repository Interface
export interface IScheduleRepository {
  findById(id: string): Promise<Schedule | null>;
  findByDepartmentAndMonth(departmentId: string, month: Date): Promise<Schedule[]>;
  save(schedule: Schedule): Promise<void>;
  update(schedule: Schedule): Promise<void>;
  delete(id: string): Promise<void>;
  findByOrganization(organizationId: string, options: PaginationOptions): Promise<PaginatedResult<Schedule>>;
}

// Repository Implementation
export class ScheduleRepository implements IScheduleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Schedule | null> {
    const scheduleData = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        shifts: {
          include: {
            employee: true
          }
        },
        department: true
      }
    });

    if (!scheduleData) return null;

    return ScheduleMapper.toDomain(scheduleData);
  }

  async save(schedule: Schedule): Promise<void> {
    const data = ScheduleMapper.toPersistence(schedule);
    
    await this.prisma.schedule.create({
      data: {
        ...data,
        shifts: {
          create: data.shifts
        }
      }
    });

    // Dispatch domain events
    const events = schedule.getDomainEvents();
    await this.dispatchEvents(events);
  }
}
```

### 4.4 CQRS Implementation
```typescript
// Command
export class CreateScheduleCommand implements ICommand {
  constructor(
    public readonly departmentId: string,
    public readonly monthReference: Date,
    public readonly createdBy: string,
    public readonly shifts: CreateShiftDto[]
  ) {}
}

// Command Handler
export class CreateScheduleCommandHandler implements ICommandHandler<CreateScheduleCommand> {
  constructor(
    private readonly scheduleRepository: IScheduleRepository,
    private readonly departmentRepository: IDepartmentRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: CreateScheduleCommand): Promise<string> {
    const department = await this.departmentRepository.findById(command.departmentId);
    if (!department) {
      throw new DepartmentNotFoundError(command.departmentId);
    }

    const schedule = Schedule.create(
      uuid(),
      command.departmentId,
      command.monthReference,
      command.createdBy
    );

    // Add shifts
    for (const shiftDto of command.shifts) {
      const shift = Shift.create(
        uuid(),
        shiftDto.employeeId,
        shiftDto.startTime,
        shiftDto.endTime,
        shiftDto.shiftType
      );
      schedule.addShift(shift);
    }

    await this.scheduleRepository.save(schedule);
    
    // Publish events
    const events = schedule.getDomainEvents();
    await this.eventBus.publishAll(events);

    return schedule.id;
  }
}

// Query
export class GetScheduleByIdQuery implements IQuery {
  constructor(public readonly id: string) {}
}

// Query Handler
export class GetScheduleByIdQueryHandler implements IQueryHandler<GetScheduleByIdQuery, ScheduleDto> {
  constructor(
    private readonly scheduleRepository: IScheduleRepository,
    private readonly cache: ICacheService
  ) {}

  async execute(query: GetScheduleByIdQuery): Promise<ScheduleDto> {
    const cacheKey = `schedule:${query.id}`;
    
    // Check cache first
    const cached = await this.cache.get<ScheduleDto>(cacheKey);
    if (cached) return cached;

    const schedule = await this.scheduleRepository.findById(query.id);
    if (!schedule) {
      throw new ScheduleNotFoundError(query.id);
    }

    const dto = ScheduleMapper.toDto(schedule);
    
    // Cache for 5 minutes
    await this.cache.set(cacheKey, dto, 300);

    return dto;
  }
}
```

## 5. Configurações de Desenvolvimento

### 5.1 Environment Configuration
```typescript
// config/app.config.ts
export interface AppConfig {
  env: 'development' | 'staging' | 'production';
  port: number;
  host: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
  };
}

const config: AppConfig = {
  env: (process.env.NODE_ENV as AppConfig['env']) || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf']
  }
};

export default config;
```

### 5.2 Database Configuration
```typescript
// config/database.config.ts
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  pool: {
    min: number;
    max: number;
    acquire: number;
    idle: number;
  };
}

const config: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'getescala',
  ssl: process.env.DB_SSL === 'true',
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '0', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
    idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10)
  }
};

export default config;
```

### 5.3 Logging Configuration
```typescript
// shared/utils/logger.ts
import winston from 'winston';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }),
  new winston.transports.File({ filename: 'logs/all.log' })
];

const Logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports
});

export default Logger;
```

## 6. Testes e Qualidade

### 6.1 Testing Strategy
```json
{
  "unit": {
    "coverage": 80,
    "tools": ["Jest", "React Testing Library"],
    "scope": ["Components", "Utils", "Hooks", "Services"]
  },
  "integration": {
    "coverage": 70,
    "tools": ["Jest", "Supertest"],
    "scope": ["API Endpoints", "Database", "External Services"]
  },
  "e2e": {
    "coverage": 60,
    "tools": ["Cypress", "Detox"],
    "scope": ["User Flows", "Critical Paths"]
  },
  "performance": {
    "tools": ["Lighthouse", "k6"],
    "metrics": ["Load Time < 3s", "FCP < 1.5s", "LCP < 2.5s"]
  },
  "security": {
    "tools": ["Snyk", "OWASP ZAP"],
    "scope": ["Dependencies", "API Security", "Vulnerabilities"]
  }
}
```

### 6.2 Unit Test Example
```typescript
// components/ScheduleCalendar/ScheduleCalendar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ScheduleCalendar from './ScheduleCalendar';
import { scheduleReducer } from '../../store/schedule/scheduleSlice';

describe('ScheduleCalendar', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        schedule: scheduleReducer
      },
      preloadedState: {
        schedule: {
          schedules: [],
          loading: false,
          error: null
        }
      }
    });
  });

  it('renders calendar grid', () => {
    render(
      <Provider store={store}>
        <ScheduleCalendar />
      </Provider>
    );

    expect(screen.getByTestId('calendar-grid')).toBeInTheDocument();
  });

  it('handles shift click', () => {
    const mockShift = {
      id: 'shift-1',
      employeeId: 'emp-1',
      startTime: new Date('2024-01-15T08:00:00'),
      endTime: new Date('2024-01-15T16:00:00')
    };

    render(
      <Provider store={store}>
        <ScheduleCalendar shifts={[mockShift]} />
      </Provider>
    );

    const shiftElement = screen.getByTestId('shift-shift-1');
    fireEvent.click(shiftElement);

    expect(screen.getByTestId('shift-editor')).toBeInTheDocument();
  });
});
```

### 6.3 Integration Test Example
```typescript
// tests/integration/schedule.api.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/shared/database/connection';

describe('Schedule API', () => {
  let authToken: string;
  let organizationId: string;
  let departmentId: string;

  beforeAll(async () => {
    // Setup test data
    const organization = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        cnpj: '12345678000195'
      }
    });
    organizationId = organization.id;

    const department = await prisma.department.create({
      data: {
        name: 'Test Department',
        code: 'TEST',
        organizationId
      }
    });
    departmentId = department.id;

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123',
        organizationId
      });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/schedules', () => {
    it('creates a new schedule', async () => {
      const scheduleData = {
        departmentId,
        monthReference: '2024-01-01',
        shifts: [
          {
            employeeId: 'emp-1',
            shiftType: 'morning',
            startTime: '2024-01-01T08:00:00Z',
            endTime: '2024-01-01T16:00:00Z'
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('draft');
      expect(response.body.shifts).toHaveLength(1);
    });

    it('validates required fields', async () => {
      const invalidData = {
        departmentId: '',
        monthReference: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'departmentId',
          message: 'Department ID is required'
        })
      );
    });
  });
});
```

## 7. Scripts e Automação

### 7.1 Development Scripts
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
    "dev:api": "cd apps/api && npm run dev",
    "dev:web": "cd apps/web && npm run dev",
    "dev:mobile": "cd apps/mobile && npm run android",
    
    "build": "npm run build:shared && npm run build:api && npm run build:web",
    "build:api": "cd apps/api && npm run build",
    "build:web": "cd apps/web && npm run build",
    "build:mobile": "cd apps/mobile && npm run build",
    
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "jest --config jest.config.js",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "cypress run",
    "test:coverage": "jest --coverage",
    
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    
    "db:migrate": "cd apps/api && npm run db:migrate",
    "db:seed": "cd apps/api && npm run db:seed",
    "db:reset": "cd apps/api && npm run db:reset",
    
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    
    "deploy:staging": "npm run build && ./scripts/deploy-staging.sh",
    "deploy:production": "npm run build && ./scripts/deploy-production.sh"
  }
}
```

### 7.2 Database Migration Script
```typescript
// tools/scripts/migrate.ts
import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger';

const prisma = new PrismaClient();

async function runMigrations() {
  try {
    Logger.info('Starting database migrations...');
    
    // Run Prisma migrations
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    
    // Custom migrations
    await createIndexes();
    await createTriggers();
    await createPolicies();
    
    Logger.info('Database migrations completed successfully');
  } catch (error) {
    Logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function createIndexes() {
  Logger.info('Creating database indexes...');
  
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_schedules_department_month ON schedules(department_id, month_reference)',
    'CREATE INDEX IF NOT EXISTS idx_shifts_employee_time ON shifts(employee_id, start_time, end_time)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)'
  ];

  for (const index of indexes) {
    await prisma.$executeRawUnsafe(index);
  }
}

async function createTriggers() {
  Logger.info('Creating database triggers...');
  
  const triggers = [
    `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
    `,
    `
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `,
    `
    CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `
  ];

  for (const trigger of triggers) {
    await prisma.$executeRawUnsafe(trigger);
  }
}

async function createPolicies() {
  Logger.info('Creating row-level security policies...');
  
  const policies = [
    'ALTER TABLE schedules ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE shifts ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE employees ENABLE ROW LEVEL SECURITY',
    `
    CREATE POLICY organization_isolation ON schedules
    FOR ALL TO authenticated
    USING (organization_id = current_setting('app.current_organization_id')::uuid)
    `
  ];

  for (const policy of policies) {
    await prisma.$executeRawUnsafe(policy);
  }
}

runMigrations();
```

## 8. Padrões de Código e Convenções

### 8.1 TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "removeComments": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/components/*": ["components/*"],
      "@/hooks/*": ["hooks/*"],
      "@/services/*": ["services/*"],
      "@/utils/*": ["utils/*"],
      "@/types/*": ["types/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### 8.2 ESLint Configuration
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended'
  ],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/prefer-const': 'error',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'jsx-a11y/anchor-is-valid': 'warn'
  }
};
```

### 8.3 Naming Conventions
```typescript
// Interfaces - PascalCase with I prefix
interface IUserService {}
interface IScheduleRepository {}

// Classes - PascalCase
class ScheduleService {}
class EmployeeController {}

// Functions - camelCase
function calculateOvertime() {}
function validateSchedule() {}

// Constants - UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DEFAULT_PAGE_SIZE = 20;

// Enums - PascalCase with Enum suffix
enum ScheduleStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

// Types - PascalCase
type UserRole = 'admin' | 'manager' | 'employee';
type ShiftType = 'morning' | 'afternoon' | 'night';

// Private properties - underscore prefix
class Schedule {
  private _id: string;
  private _shifts: Shift[];
}

// React Components - PascalCase
const ScheduleCalendar: React.FC<ScheduleCalendarProps> = () => {};
const EmployeeProfile: React.FC<EmployeeProfileProps> = () => {};
```

### 8.4 File Organization Rules
```
✅ Good:
components/
├── Button/
│   ├── Button.tsx           # Component
│   ├── Button.test.tsx      # Tests
│   ├── Button.stories.tsx   # Storybook
│   ├── Button.types.ts      # Types
│   ├── Button.styles.ts     # Styles
│   └── index.ts             # Export barrel

❌ Bad:
components/
├── Button.tsx               # Mixed concerns
├── button.test.tsx          # Inconsistent naming
├── buttonStyles.css         # Scattered files
└── ButtonProps.ts           # Separate types
```

## 9. Segurança e Performance

### 9.1 Security Best Practices
```typescript
// Input Validation
import Joi from 'joi';

const createScheduleSchema = Joi.object({
  departmentId: Joi.string().uuid().required(),
  monthReference: Joi.date().iso().required(),
  shifts: Joi.array().items(
    Joi.object({
      employeeId: Joi.string().uuid().required(),
      startTime: Joi.date().iso().required(),
      endTime: Joi.date().iso().greater(Joi.ref('startTime')).required()
    })
  ).min(1).required()
});

// Rate Limiting
import rateLimit from 'express-rate-limit';

const createScheduleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many schedule creation attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// SQL Injection Prevention
export class ScheduleRepository {
  async findByDepartment(departmentId: string): Promise<Schedule[]> {
    // ✅ Good: Parameterized query
    return await this.prisma.schedule.findMany({
      where: { departmentId }
    });
    
    // ❌ Bad: String concatenation
    // const query = `SELECT * FROM schedules WHERE department_id = '${departmentId}'`;
  }
}

// XSS Prevention
import DOMPurify from 'isomorphic-dompurify';

export class InputSanitizer {
  static sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'],
      ALLOWED_ATTR: []
    });
  }
}
```

### 9.2 Performance Optimization
```typescript
// Database Query Optimization
export class ScheduleRepository {
  async findByOrganizationWithStats(
    organizationId: string, 
    options: PaginationOptions
  ): Promise<PaginatedResult<Schedule>> {
    // ✅ Good: Single query with joins
    const [schedules, total] = await this.prisma.$transaction([
      this.prisma.schedule.findMany({
        where: { 
          department: { organizationId } 
        },
        include: {
          department: true,
          shifts: {
            include: {
              employee: true
            }
          },
          _count: {
            select: { shifts: true }
          }
        },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.schedule.count({
        where: { 
          department: { organizationId } 
        }
      })
    ]);

    return {
      data: schedules,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    };
  }
}

// Caching Strategy
import { redis } from '../config/redis.config';

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// Frontend Performance
// Lazy Loading Components
const ScheduleCalendar = lazy(() => 
  import('./components/schedule/ScheduleCalendar').then(module => ({
    default: module.ScheduleCalendar
  }))
);

// Virtual Scrolling for Large Lists
import { FixedSizeList } from 'react-window';

const EmployeeList: React.FC<{ employees: Employee[] }> = ({ employees }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <EmployeeCard employee={employees[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={employees.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

## 10. Deployment e DevOps

### 10.1 Docker Configuration
```dockerfile
# Dockerfile for API
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S getescala -u 1001

# Copy built application
COPY --from=builder --chown=getescala:nodejs /app/dist ./dist
COPY --from=builder --chown=getescala:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=getescala:nodejs /app/package*.json ./
COPY --from=builder --chown=getescala:nodejs /app/prisma ./prisma

# Switch to non-root user
USER getescala

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js

# Start the application
CMD ["npm", "start"]
```

### 10.2 Docker Compose for Development
```yaml
version: '3.8'

services:
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USERNAME=postgres
      - DB_PASSWORD=password
      - DB_NAME=getescala_dev
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    depends_on:
      - postgres
      - redis
    command: npm run dev

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=development
      - REACT_APP_API_URL=http://localhost:3000
    volumes:
      - ./apps/web:/app
      - /app/node_modules
    depends_on:
      - api
    command: npm run dev

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=getescala_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./tools/init-db.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./tools/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api
      - web

volumes:
  postgres_data:
  redis_data:
```

### 10.3 CI/CD Pipeline (GitHub Actions)
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
      
      - name: Run security audit
        run: npm audit --audit-level high

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push Docker image
        id: build
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to staging
        run: |
          aws ecs update-service \
            --cluster getescala-staging \
            --service getescala-api \
            --force-new-deployment
      
      - name: Run smoke tests
        run: |
          npm install -g newman
          newman run tests/smoke-tests.json \
            --environment tests/staging-environment.json

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Blue-Green Deployment
        run: |
          # Deploy to green environment
          aws ecs update-service \
            --cluster getescala-production \
            --service getescala-api-green \
            --force-new-deployment
          
          # Wait for green to be healthy
          aws ecs wait services-stable \
            --cluster getescala-production \
            --services getescala-api-green
          
          # Switch traffic to green
          aws appmesh update-route \
            --mesh-name getescala-mesh \
            --virtual-router-name getescala-router \
            --route-name getescala-route \
            --spec file://green-route-spec.json
          
          # Update blue for next deployment
          aws ecs update-service \
            --cluster getescala-production \
            --service getescala-api-blue \
            --force-new-deployment

  notify:
    needs: [deploy-staging, deploy-production]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Notify deployment status
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 11. Monitoramento e Observabilidade

### 11.1 Application Monitoring
```typescript
// Monitoring Service
export class MonitoringService {
  constructor(
    private readonly metrics: MetricsService,
    private readonly tracing: TracingService,
    private readonly logging: LoggingService
  ) {}

  trackApiCall(method: string, endpoint: string, duration: number, status: number): void {
    this.metrics.increment('api.calls.total', {
      method,
      endpoint,
      status: status.toString()
    });

    this.metrics.histogram('api.calls.duration', duration, {
      method,
      endpoint
    });

    if (status >= 400) {
      this.metrics.increment('api.calls.errors', {
        method,
        endpoint,
        status: status.toString()
      });
    }
  }

  trackDatabaseQuery(query: string, duration: number, error?: Error): void {
    this.metrics.histogram('db.query.duration', duration, {
      table: this.extractTableName(query),
      operation: this.extractOperation(query)
    });

    if (error) {
      this.metrics.increment('db.query.errors', {
        table: this.extractTableName(query),
        error: error.name
      });
    }
  }

  trackBusinessEvent(event: string, properties: Record<string, any>): void {
    this.metrics.increment(`business.${event}`, properties);
    
    this.logging.info('Business event tracked', {
      event,
      properties,
      timestamp: new Date().toISOString()
    });
  }
}

// Middleware for automatic monitoring
export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    monitoringService.trackApiCall(
      req.method,
      req.route?.path || req.path,
      duration,
      res.statusCode
    );
  });

  next();
};
```

### 11.2 Health Checks
```typescript
// Health Check Service
export class HealthCheckService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: RedisClient,
    private readonly emailService: EmailService
  ) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkEmailService(),
      this.checkDiskSpace(),
      this.checkMemoryUsage()
    ]);

    const results = {
      database: checks[0],
      redis: checks[1],
      email: checks[2],
      disk: checks[3],
      memory: checks[4]
    };

    const isHealthy = Object.values(results).every(
      result => result.status === 'fulfilled'
    );

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: results,
      version: process.env.npm_package_version
    };
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }

  private async checkRedis(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      await this.redis.ping();
      
      return {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }
}

// Health Check Route
export const healthCheckRouter = Router();

healthCheckRouter.get('/health', async (req: Request, res: Response) => {
  const healthStatus = await healthCheckService.getHealthStatus();
  
  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json(healthStatus);
});

healthCheckRouter.get('/health/ready', async (req: Request, res: Response) => {
  const isReady = await healthCheckService.isReady();
  
  res.status(isReady ? 200 : 503).json({ ready: isReady });
});

healthCheckRouter.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({ alive: true });
});
```

### 11.3 Alerting Configuration
```yaml
# Prometheus Alert Rules
groups:
- name: getescala-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(api_calls_errors_total[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} errors per second"

  - alert: HighResponseTime
    expr: histogram_quantile(0.95, api_calls_duration_bucket) > 1000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "95th percentile response time is {{ $value }}ms"

  - alert: DatabaseConnectionFailure
    expr: up{job="postgres-exporter"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Database connection failure"
      description: "Cannot connect to PostgreSQL database"

  - alert: RedisConnectionFailure
    expr: up{job="redis-exporter"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Redis connection failure"
      description: "Cannot connect to Redis cache"

  - alert: HighMemoryUsage
    expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage"
      description: "Memory usage is {{ $value | humanizePercentage }}"
```

## 12. Manutenção e Suporte

### 12.1 Database Maintenance Scripts
```typescript
// tools/maintenance/cleanup.ts
import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger';

const prisma = new PrismaClient();

async function cleanupOldData() {
  try {
    Logger.info('Starting data cleanup...');

    // Clean up old audit logs (keep 90 days)
    const auditLogsDeleted = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      }
    });

    Logger.info(`Deleted ${auditLogsDeleted.count} old audit logs`);

    // Clean up old notifications (keep 30 days)
    const notificationsDeleted = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        isRead: true
      }
    });

    Logger.info(`Deleted ${notificationsDeleted.count} old notifications`);

    // Archive old schedules (keep 2 years)
    const schedulesToArchive = await prisma.schedule.findMany({
      where: {
        monthReference: {
          lt: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
        }
      },
      select: { id: true }
    });

    for (const schedule of schedulesToArchive) {
      // Archive to S3
      await archiveScheduleToS3(schedule.id);
      
      // Delete from database
      await prisma.schedule.delete({
        where: { id: schedule.id }
      });
    }

    Logger.info(`Archived ${schedulesToArchive.length} old schedules`);

    Logger.info('Data cleanup completed successfully');
  } catch (error) {
    Logger.error('Data cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function updateStatistics() {
  try {
    Logger.info('Updating statistics...');

    // Update organization statistics
    await prisma.$executeRaw`
      UPDATE organizations
      SET 
        employee_count = (SELECT COUNT(*) FROM employees WHERE organization_id = organizations.id),
        schedule_count = (SELECT COUNT(*) FROM schedules s 
                          JOIN departments d ON s.department_id = d.id 
                          WHERE d.organization_id = organizations.id),
        updated_at = NOW()
      WHERE 1=1
    `;

    // Update department statistics
    await prisma.$executeRaw`
      UPDATE departments
      SET 
        employee_count = (SELECT COUNT(*) FROM employees WHERE department_id = departments.id),
        schedule_count = (SELECT COUNT(*) FROM schedules WHERE department_id = departments.id),
        updated_at = NOW()
      WHERE 1=1
    `;

    Logger.info('Statistics updated successfully');
  } catch (error) {
    Logger.error('Statistics update failed:', error);
    throw error;
  }
}

// Run maintenance
async function runMaintenance() {
  await cleanupOldData();
  await updateStatistics();
}

runMaintenance();
```

### 12.2 Backup and Recovery Procedures
```bash
#!/bin/bash
# tools/backup/backup-database.sh

set -e

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-getescala}
DB_USER=${DB_USER:-postgres}
BACKUP_DIR=${BACKUP_DIR:-/backups}
S3_BUCKET=${S3_BUCKET:-getescala-backups}
RETENTION_DAYS=${RETENTION_DAYS:-30}

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/getescala_${TIMESTAMP}.sql.gz"

# Create database backup
echo "Creating database backup..."
pg_dump \
  --host=$DB_HOST \
  --port=$DB_PORT \
  --username=$DB_USER \
  --dbname=$DB_NAME \
  --verbose \
  --format=plain \
  --compress=9 |
  gzip > $BACKUP_FILE

# Verify backup
if [ ! -f $BACKUP_FILE ]; then
  echo "Backup failed: file not created"
  exit 1
fi

# Test backup integrity
echo "Testing backup integrity..."
gunzip -t $BACKUP_FILE

# Upload to S3
echo "Uploading to S3..."
aws s3 cp $BACKUP_FILE s3://$S3_BUCKET/database/

# Clean up old backups
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "getescala_*.sql.gz" -mtime +7 -delete

aws s3 ls s3://$S3_BUCKET/database/ |
  awk '{print $4}' |
  sort -r |
  tail -n +$((RETENTION_DAYS + 1)) |
  xargs -I {} aws s3 rm s3://$S3_BUCKET/database/{}

echo "Backup completed successfully: $BACKUP_FILE"
```

### 12.3 Troubleshooting Guide
```markdown
# GETESCALA Troubleshooting Guide

## Common Issues

### 1. Database Connection Issues
**Symptoms:**
- API returns 500 errors
- "Connection refused" errors in logs
- High response times

**Solutions:**
1. Check database status:
   ```bash
   docker-compose ps postgres
   ```

2. Verify connection parameters:
   ```bash
   docker-compose exec api env | grep DB_
   ```

3. Test connection manually:
   ```bash
   docker-compose exec api npx prisma db ping
   ```

4. Check connection pool:
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

### 2. High Memory Usage
**Symptoms:**
- Container restarts frequently
- OOM errors in logs
- Slow response times

**Solutions:**
1. Check memory usage:
   ```bash
