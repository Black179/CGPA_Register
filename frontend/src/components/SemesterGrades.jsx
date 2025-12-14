import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Button, FormControl, FormLabel, Select, Table, Thead, Tbody, Tr, Th, Td, 
  VStack, Heading, useToast, HStack, Text, Badge
} from '@chakra-ui/react';
import { SEMESTER_SUBJECTS, GRADES } from '../constants/constants';

const SemesterGrades = () => {
  const [currentSemester, setCurrentSemester] = useState(1);
  const [grades, setGrades] = useState({});
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const savedData = localStorage.getItem('userData');
    if (!savedData) {
      navigate('/');
      return;
    }
    setUserData(JSON.parse(savedData));
  }, [navigate]);

  const calculateSemesterProgress = (semester) => {
    const semSubjects = SEMESTER_SUBJECTS[semester] || [];
    const totalSubjects = semSubjects.length;
    const completedSubjects = semSubjects.filter(subj => grades[`${semester}-${subj.code}`]).length;
    return (completedSubjects / totalSubjects) * 100;
  };

  const handleGradeChange = (semester, subjectCode, grade) => {
    setGrades(prev => ({
      ...prev,
      [`${semester}-${subjectCode}`]: grade
    }));
  };

  const handleSubmit = () => {
    const allGradesSelected = Array.from({ length: userData.totalSemesters }, (_, i) => i + 1)
      .every(sem => {
        const semSubjects = SEMESTER_SUBJECTS[sem] || [];
        return semSubjects.every(subj => grades[`${sem}-${subj.code}`]);
      });

    if (!allGradesSelected) {
      toast({
        title: 'Incomplete Grades',
        description: 'Please select grades for all subjects in all semesters',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const semestersData = Array.from({ length: userData.totalSemesters }, (_, i) => {
      const sem = i + 1;
      const semSubjects = SEMESTER_SUBJECTS[sem] || [];
      
      const subjects = semSubjects.map(subj => {
        const grade = grades[`${sem}-${subj.code}`] || 'U';
        const gradeObj = GRADES.find(g => g.value === grade) || GRADES[GRADES.length - 1];
        
        return {
          code: subj.code,
          name: subj.name,
          credits: subj.credits,
          grade: grade,
          gradePoint: gradeObj.points
        };
      });

      const totalCredits = subjects.reduce((sum, subj) => sum + subj.credits, 0);
      const totalPoints = subjects.reduce((sum, subj) => sum + (subj.credits * subj.gradePoint), 0);
      const sgpa = parseFloat((totalPoints / totalCredits).toFixed(2));

      return {
        semesterNo: sem,
        subjects,
        sgpa
      };
    });

    const completeData = {
      ...userData,
      semesters: semestersData
    };
    localStorage.setItem('userData', JSON.stringify(completeData));
    navigate('/result');
  };

  if (!userData) return null;

  return (
    <VStack spacing={4} align='stretch'>
      <Heading size='lg' textAlign='center'>
        Enter Grades for Semester {currentSemester}
      </Heading>

      {/* Simple semester selection */}
      <HStack spacing={3} justify='center' wrap='wrap'>
        {Array.from({ length: userData.totalSemesters }, (_, i) => i + 1).map(sem => {
          const progress = calculateSemesterProgress(sem);
          const isCompleted = progress === 100;
          
          return (
            <VStack key={sem} spacing={1}>
              <Button
                colorScheme={currentSemester === sem ? 'blue' : isCompleted ? 'green' : 'gray'}
                onClick={() => setCurrentSemester(sem)}
              >
                Semester {sem}
                {isCompleted && ' ✓'}
              </Button>
              <Text fontSize='xs' color='gray.600'>
                {Math.round(progress)}%
              </Text>
            </VStack>
          );
        })}
      </HStack>

      {/* Simple subject table */}
      <Box overflowX='auto'>
        <Table variant='simple'>
          <Thead>
            <Tr>
              <Th>Subject Code</Th>
              <Th>Subject Name</Th>
              <Th>Credits</Th>
              <Th>Grade</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {(SEMESTER_SUBJECTS[currentSemester] || []).map(subject => {
              const grade = grades[`${currentSemester}-${subject.code}`];
              const isCompleted = !!grade;
              
              return (
                <Tr key={subject.code}>
                  <Td>{subject.code}</Td>
                  <Td>{subject.name}</Td>
                  <Td>{subject.credits}</Td>
                  <Td>
                    <Select
                      value={grade || ''}
                      onChange={(e) => handleGradeChange(currentSemester, subject.code, e.target.value)}
                      placeholder='Select grade'
                    >
                      {GRADES.map(grade => (
                        <option key={grade.value} value={grade.value}>
                          {grade.label}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td>
                    {isCompleted ? (
                      <Badge colorScheme='green'>Done</Badge>
                    ) : (
                      <Badge colorScheme='gray'>Pending</Badge>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>

      <HStack justify='space-between' mt={4}>
        <Button onClick={() => navigate('/')}>Back</Button>
        <Button 
          colorScheme='blue' 
          onClick={handleSubmit}
          isDisabled={
            !(SEMESTER_SUBJECTS[currentSemester] || []).every(
              subj => grades[`${currentSemester}-${subj.code}`]
            )
          }
        >
          Calculate Results
        </Button>
      </HStack>
    </VStack>
  );
};

export default SemesterGrades;
